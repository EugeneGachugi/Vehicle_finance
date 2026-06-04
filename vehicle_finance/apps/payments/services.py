from django.utils import timezone
from .models import FinancingContract, Payment, Invoice
from decimal import Decimal, InvalidOperation
import uuid
from datetime import timedelta
import base64
import datetime
import requests
from django.conf import settings
from requests.auth import HTTPBasicAuth


class InvalidMpesaAmount(ValueError):
    pass


def normalize_mpesa_amount(amount):
    try:
        amount_decimal = Decimal(str(amount))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise InvalidMpesaAmount('M-Pesa amount must be a valid number.') from exc

    if amount_decimal <= 0:
        raise InvalidMpesaAmount('M-Pesa amount must be greater than zero.')

    if amount_decimal != amount_decimal.to_integral_value():
        raise InvalidMpesaAmount('M-Pesa payments must use whole Kenyan shillings.')

    return amount_decimal.quantize(Decimal('1'))


class MpesaClient:
    @staticmethod
    def _generate_password(timestamp):
        password_str = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
        return base64.b64encode(password_str.encode("utf-8")).decode("utf-8")

    @staticmethod
    def get_auth_token():
        url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        r = requests.get(
            url,
            auth=HTTPBasicAuth(settings.MPESA_CONSUMER_KEY, settings.MPESA_CONSUMER_SECRET),
            timeout=30,
        )
        r.raise_for_status()
        return r.json()["access_token"]

    @staticmethod
    def trigger_stk_push(phone_number, amount, reference):
        amount = normalize_mpesa_amount(amount)
        access_token = MpesaClient.get_auth_token()
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        reference = str(reference).replace("-", "")[:12]

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": MpesaClient._generate_password(timestamp),
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": int(amount),
            "PartyA": phone_number,
            "PartyB": settings.MPESA_SHORTCODE,
            "PhoneNumber": phone_number,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": reference,
            "TransactionDesc": f"Remittance Ref: {reference}",
        }

        url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        r = requests.post(url, json=payload, headers=headers, timeout=30)
        r.raise_for_status()
        return r.json()

    @staticmethod
    def query_stk_status(checkout_request_id):
        access_token = MpesaClient.get_auth_token()
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": MpesaClient._generate_password(timestamp),
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        }

        url = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"
        r = requests.post(url, json=payload, headers=headers, timeout=30)
        r.raise_for_status()
        return r.json()


def generate_weekly_invoices():
    #find alll active contracts and generate the next invoice for those whose billing date is today
    today_date=timezone.now().date()
    target_date=today_date+timedelta(days=2)
    today_name=today_date.strftime('%a').upper()

    contracts_to_bill = FinancingContract.objects.filter(
        status='AC',
        billing_day=today_name
    )

    invoices_created=0

    for contract in contracts_to_bill:
        obj, created = Invoice.objects.get_or_create(
            contract=contract,
            due_date = target_date,
            defaults={
                'amount_due': contract.weekly_installment,
                'amount_paid' : 0.00,
                'status' : 'UNPAID'
            }
        )
        if created:
            invoices_created += 1

            if contract.prepayment_balance >= obj.amount_due:
                contract.prepayment_balance -= obj.amount_due
                contract.weeks_paid += 1
                obj.amount_paid = obj.amount_due
                obj.status = 'PAID'
                obj.save()
                contract.save()
            
    return invoices_created

def immobilize_vehicle(target_date=None):
    today = target_date or timezone.now().date()
    yesterday = today - timedelta(days=1)

    #fetching unpaid invoices due yesterday
    overdue_invoices= Invoice.objects.filter(
        status = 'UNPAID',
        due_date = yesterday
    )
    for invoice in overdue_invoices:
        vehicle = invoice.contract.vehicle
        if vehicle.status != 'IM':
            vehicle.status = 'IM'
            vehicle.save()

def process_payment_logic(invoice, amount_received, mpesa_code):
    contract = invoice.contract
    received_decimal = Decimal(str(amount_received))
    previous_amount_paid = invoice.amount_paid
    was_paid = (
        invoice.status in (Invoice.InvoiceStatus.PAID, Invoice.InvoiceStatus.OVERPAID)
        or previous_amount_paid >= invoice.amount_due
    )

    payment = Payment.objects.create(
        invoice=invoice,
        amount=received_decimal,
        mpesa_receipt=mpesa_code
    )

    invoice.amount_paid += received_decimal

    if invoice.amount_paid >= invoice.amount_due:
        previous_surplus = max(previous_amount_paid - invoice.amount_due, Decimal('0'))
        current_surplus = invoice.amount_paid - invoice.amount_due
        new_surplus = current_surplus - previous_surplus
        invoice.status = 'PAID'

        if new_surplus > 0:
            contract.prepayment_balance += new_surplus

        if not was_paid:
            contract.weeks_paid += 1

            vehicle = contract.vehicle
            if vehicle.status == 'IM':
                vehicle.status = 'FI'
                vehicle.save()

    elif invoice.amount_paid > 0:
        invoice.status = 'PARTIAL'

    invoice.save()
    contract.save()
    return payment
