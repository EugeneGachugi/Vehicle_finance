from django.utils import timezone
from .models import FinancingContract, Payment, Invoice
from decimal import Decimal
import uuid
from datetime import timedelta

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
    """
    Processes money hitting an invoice. Updates contract balance and vehicle status.
    """
    contract = invoice.contract
    received_decimal = Decimal(str(amount_received))
    
    # 1. Create the Payment record (for audit trailing)
    payment = Payment.objects.create(
        invoice=invoice,
        amount=received_decimal,
        mpesa_receipt=mpesa_code
    )
    
    # 2. Update the invoice amount_paid
    invoice.amount_paid += received_decimal
    
    # 3. Handle Status and Overpayment
    if invoice.amount_paid >= invoice.amount_due:
        surplus = invoice.amount_paid - invoice.amount_due
        invoice.status = 'PAID'
        
        # If they paid extra, move it to their 'wallet'
        if surplus > 0:
            contract.prepayment_balance += surplus
            
        # Increment the progress toward ownership
        contract.weeks_paid += 1
        
        # RE-ACTIVATION: If the car was locked, turn it back on
        vehicle = contract.vehicle
        if vehicle.status == 'IM':
            vehicle.status = 'FI' # 'FI' for Financed/Active
            vehicle.save()
            
    elif invoice.amount_paid > 0:
        invoice.status = 'PARTIAL'
        
    invoice.save()
    contract.save()
    return payment
