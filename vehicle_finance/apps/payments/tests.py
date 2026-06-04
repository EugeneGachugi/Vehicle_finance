from datetime import date
from decimal import Decimal
from unittest.mock import patch
from uuid import uuid4

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import DriverProfile
from apps.vehicles.models import CarMake, CarModel, Vehicle
from .models import FinancingContract, Invoice, MpesaSTKRequest, Payment
from .services import InvalidMpesaAmount, MpesaClient


User = get_user_model()


class LatestUnpaidInvoiceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='driver',
            password='test-password',
            national_id='12345678',
        )
        self.driver = DriverProfile.objects.create(
            user=self.user,
            kra_pin='A123456789B',
            dl_number='DL-001',
        )
        make = CarMake.objects.create(make='Toyota')
        model = CarModel.objects.create(make=make, name='Probox')
        self.vehicle = Vehicle.objects.create(
            plate_number='KAA 001A',
            model=model,
            yom=2020,
            chasis_number='CHASSIS-001',
            engine_number='ENGINE-001',
            color='White',
            valuation=Decimal('1000000.00'),
        )
        self.contract = FinancingContract.objects.create(
            driver=self.driver,
            vehicle=self.vehicle,
            vehicle_valuation=Decimal('1000000.00'),
            interest_rate=Decimal('10.00'),
            total_repayment=Decimal('1100000.00'),
            weekly_installment=Decimal('3500.00'),
            total_weeks=315,
            status=FinancingContract.ContractStatus.ACTIVE,
        )
        self.url = reverse('invoice-latest-unpaid')
        self.stk_push_url = reverse('mpesa-stk-push')
        self.callback_url = reverse('mpesa-callback')
        self.payment_status_url = reverse('mpesa-payment-status')
        self.client.force_authenticate(self.user)

    def create_invoice(self, due_date, status=Invoice.InvoiceStatus.UNPAID):
        return Invoice.objects.create(
            contract=self.contract,
            amount_due=Decimal('3500.00'),
            amount_paid=Decimal('0.00'),
            due_date=due_date,
            status=status,
        )

    def test_returns_current_users_latest_unpaid_invoice(self):
        self.create_invoice(date(2026, 5, 28))
        latest = self.create_invoice(date(2026, 6, 4))
        self.create_invoice(date(2026, 6, 11), Invoice.InvoiceStatus.PAID)

        other_user = User.objects.create_user(
            username='other-driver',
            password='test-password',
            national_id='87654321',
        )
        other_driver = DriverProfile.objects.create(
            user=other_user,
            kra_pin='A987654321B',
            dl_number='DL-002',
        )
        other_contract = FinancingContract.objects.create(
            driver=other_driver,
            vehicle=self.vehicle,
            vehicle_valuation=Decimal('1000000.00'),
            interest_rate=Decimal('10.00'),
            total_repayment=Decimal('1100000.00'),
            weekly_installment=Decimal('3500.00'),
            total_weeks=315,
            status=FinancingContract.ContractStatus.ACTIVE,
        )
        Invoice.objects.create(
            contract=other_contract,
            amount_due=Decimal('5000.00'),
            due_date=date(2026, 6, 18),
        )

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.json(),
            {
                'invoice_id': str(latest.id),
                'amount_due': 3500.0,
                'amount_paid': 0.0,
                'status': 'UNPAID',
            },
        )

    def test_returns_not_found_when_current_user_has_no_unpaid_invoice(self):
        self.create_invoice(date(2026, 6, 4), Invoice.InvoiceStatus.PAID)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json(), {'detail': 'No unpaid invoice found.'})

    def test_returns_partially_paid_invoice_with_outstanding_balance(self):
        invoice = self.create_invoice(date(2026, 6, 4), Invoice.InvoiceStatus.PARTIAL)
        invoice.amount_paid = Decimal('1000.00')
        invoice.save(update_fields=['amount_paid'])

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()['invoice_id'], str(invoice.id))
        self.assertEqual(response.json()['status'], Invoice.InvoiceStatus.PARTIAL)

    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    @patch('apps.payments.views.MpesaClient.trigger_stk_push')
    def test_stk_push_uses_owned_invoice_outstanding_amount(self, trigger_stk_push):
        invoice = self.create_invoice(date(2026, 6, 4))
        trigger_stk_push.return_value = {
            'CheckoutRequestID': 'ws_CO_123',
            'MerchantRequestID': 'merchant-123',
        }

        response = self.client.post(
            self.stk_push_url,
            {
                'invoice_id': str(invoice.id),
                'phone_number': '0700 000 000',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertIn('payment_request_id', response.json())
        self.assertNotIn('checkout_request_id', response.json())
        self.assertNotIn('merchant_request_id', response.json())
        trigger_stk_push.assert_called_once_with(
            phone_number='254700000000',
            amount=Decimal('3500.00'),
            reference=invoice.id,
        )
        self.assertEqual(response.json()['invoice_status'], Invoice.InvoiceStatus.UNPAID)
        self.assertFalse(response.json()['demo_completed'])
        self.assertTrue(
            MpesaSTKRequest.objects.filter(
                invoice=invoice,
                checkout_request_id='ws_CO_123',
                status=MpesaSTKRequest.RequestStatus.PENDING,
            ).exists()
        )

    @patch('apps.payments.views.MpesaClient.trigger_stk_push')
    def test_stk_push_rejects_paid_invoice(self, trigger_stk_push):
        invoice = self.create_invoice(date(2026, 6, 4), Invoice.InvoiceStatus.PAID)
        invoice.amount_paid = invoice.amount_due
        invoice.save(update_fields=['amount_paid'])

        response = self.client.post(
            self.stk_push_url,
            {
                'invoice_id': str(invoice.id),
                'phone_number': '254700000000',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        trigger_stk_push.assert_not_called()

    @patch('apps.payments.views.MpesaClient.trigger_stk_push')
    def test_stk_push_rejects_fractional_shilling_balance(self, trigger_stk_push):
        invoice = Invoice.objects.create(
            contract=self.contract,
            amount_due=Decimal('3500.50'),
            amount_paid=Decimal('0.00'),
            due_date=date(2026, 6, 4),
        )

        response = self.client.post(
            self.stk_push_url,
            {
                'invoice_id': str(invoice.id),
                'phone_number': '254700000000',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.json(),
            {'detail': 'M-Pesa payments must use whole Kenyan shillings.'},
        )
        trigger_stk_push.assert_not_called()
        self.assertFalse(MpesaSTKRequest.objects.filter(invoice=invoice).exists())

    @patch('apps.payments.views.MpesaClient.trigger_stk_push')
    def test_stk_push_cannot_pay_another_drivers_invoice(self, trigger_stk_push):
        other_user = User.objects.create_user(
            username='stk-other-driver',
            password='test-password',
            national_id='11223344',
        )
        other_driver = DriverProfile.objects.create(
            user=other_user,
            kra_pin='A112233445B',
            dl_number='DL-003',
        )
        other_contract = FinancingContract.objects.create(
            driver=other_driver,
            vehicle=self.vehicle,
            vehicle_valuation=Decimal('1000000.00'),
            interest_rate=Decimal('10.00'),
            total_repayment=Decimal('1100000.00'),
            weekly_installment=Decimal('3500.00'),
            total_weeks=315,
            status=FinancingContract.ContractStatus.ACTIVE,
        )
        other_invoice = Invoice.objects.create(
            contract=other_contract,
            amount_due=Decimal('3500.00'),
            due_date=date(2026, 6, 4),
        )

        response = self.client.post(
            self.stk_push_url,
            {
                'invoice_id': str(other_invoice.id),
                'phone_number': '254700000000',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        trigger_stk_push.assert_not_called()

    @override_settings(MPESA_DEMO_AUTO_COMPLETE=True)
    @patch('apps.payments.views.MpesaClient.trigger_stk_push')
    def test_demo_stk_push_marks_invoice_paid(self, trigger_stk_push):
        invoice = self.create_invoice(date(2026, 6, 4))
        trigger_stk_push.return_value = {
            'CheckoutRequestID': 'ws_CO_123',
            'MerchantRequestID': 'merchant-demo',
        }

        response = self.client.post(
            self.stk_push_url,
            {
                'invoice_id': str(invoice.id),
                'phone_number': '254700000000',
            },
            format='json',
        )

        invoice.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_202_ACCEPTED)
        self.assertTrue(response.json()['demo_completed'])
        self.assertEqual(invoice.status, Invoice.InvoiceStatus.PAID)
        self.assertEqual(invoice.amount_paid, invoice.amount_due)
        self.assertEqual(
            MpesaSTKRequest.objects.get(invoice=invoice).status,
            MpesaSTKRequest.RequestStatus.SUCCESS,
        )

    @patch('apps.payments.views.MpesaClient.query_stk_status')
    @patch('apps.payments.views.MpesaClient.trigger_stk_push')
    def test_success_callback_records_payment_once_and_updates_status(
        self,
        trigger_stk_push,
        query_stk_status,
    ):
        invoice = self.create_invoice(date(2026, 6, 4))
        trigger_stk_push.return_value = {
            'CheckoutRequestID': 'ws_CO_CALLBACK_SUCCESS',
            'MerchantRequestID': 'merchant-success',
        }
        query_stk_status.return_value = {
            'MerchantRequestID': 'merchant-success',
            'CheckoutRequestID': 'ws_CO_CALLBACK_SUCCESS',
            'ResultCode': '0',
            'ResultDesc': 'The service request is processed successfully.',
        }
        self.client.post(
            self.stk_push_url,
            {
                'invoice_id': str(invoice.id),
                'phone_number': '254700000000',
            },
            format='json',
        )
        self.client.force_authenticate(user=None)
        callback_payload = {
            'Body': {
                'stkCallback': {
                    'MerchantRequestID': 'merchant-success',
                    'CheckoutRequestID': 'ws_CO_CALLBACK_SUCCESS',
                    'ResultCode': 0,
                    'ResultDesc': 'The service request is processed successfully.',
                    'CallbackMetadata': {
                        'Item': [
                            {'Name': 'Amount', 'Value': 3500},
                            {'Name': 'MpesaReceiptNumber', 'Value': 'TESTRECEIPT123'},
                            {'Name': 'PhoneNumber', 'Value': 254700000000},
                        ],
                    },
                },
            },
        }

        first_response = self.client.post(self.callback_url, callback_payload, format='json')
        second_response = self.client.post(self.callback_url, callback_payload, format='json')

        invoice.refresh_from_db()
        stk_request = MpesaSTKRequest.objects.get(checkout_request_id='ws_CO_CALLBACK_SUCCESS')
        self.assertEqual(first_response.status_code, status.HTTP_200_OK)
        self.assertEqual(second_response.status_code, status.HTTP_200_OK)
        self.assertEqual(invoice.status, Invoice.InvoiceStatus.PAID)
        self.assertEqual(invoice.amount_paid, Decimal('3500.00'))
        self.assertEqual(stk_request.status, MpesaSTKRequest.RequestStatus.SUCCESS)
        self.assertEqual(stk_request.mpesa_receipt, 'TESTRECEIPT123')
        self.assertEqual(Payment.objects.filter(mpesa_receipt='TESTRECEIPT123').count(), 1)
        query_stk_status.assert_called_once_with('ws_CO_CALLBACK_SUCCESS')

        self.client.force_authenticate(self.user)
        status_response = self.client.get(
            self.payment_status_url,
            {'payment_request_id': str(stk_request.id)},
        )
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertEqual(status_response.json()['payment_status'], MpesaSTKRequest.RequestStatus.SUCCESS)
        self.assertEqual(status_response.json()['mpesa_receipt'], 'TESTRECEIPT123')
        self.assertNotIn('checkout_request_id', status_response.json())

    @patch('apps.payments.views.MpesaClient.query_stk_status')
    @patch('apps.payments.views.MpesaClient.trigger_stk_push')
    def test_failed_callback_keeps_invoice_unpaid(self, trigger_stk_push, query_stk_status):
        invoice = self.create_invoice(date(2026, 6, 4))
        trigger_stk_push.return_value = {
            'CheckoutRequestID': 'ws_CO_CALLBACK_FAILED',
            'MerchantRequestID': 'merchant-failed',
        }
        query_stk_status.return_value = {
            'MerchantRequestID': 'merchant-failed',
            'CheckoutRequestID': 'ws_CO_CALLBACK_FAILED',
            'ResultCode': '1032',
            'ResultDesc': 'Request cancelled by user.',
        }
        self.client.post(
            self.stk_push_url,
            {
                'invoice_id': str(invoice.id),
                'phone_number': '254700000000',
            },
            format='json',
        )
        self.client.force_authenticate(user=None)

        response = self.client.post(
            self.callback_url,
            {
                'Body': {
                    'stkCallback': {
                        'MerchantRequestID': 'merchant-failed',
                        'CheckoutRequestID': 'ws_CO_CALLBACK_FAILED',
                        'ResultCode': 1032,
                        'ResultDesc': 'Request cancelled by user.',
                    },
                },
            },
            format='json',
        )

        invoice.refresh_from_db()
        stk_request = MpesaSTKRequest.objects.get(checkout_request_id='ws_CO_CALLBACK_FAILED')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(invoice.status, Invoice.InvoiceStatus.UNPAID)
        self.assertEqual(stk_request.status, MpesaSTKRequest.RequestStatus.FAILED)
        self.assertEqual(Payment.objects.filter(invoice=invoice).count(), 0)

    @patch('apps.payments.views.MpesaClient.query_stk_status')
    @patch('apps.payments.views.MpesaClient.trigger_stk_push')
    def test_forged_success_callback_cannot_record_payment(
        self,
        trigger_stk_push,
        query_stk_status,
    ):
        invoice = self.create_invoice(date(2026, 6, 4))
        trigger_stk_push.return_value = {
            'CheckoutRequestID': 'ws_CO_FORGED_SUCCESS',
            'MerchantRequestID': 'merchant-forged',
        }
        query_stk_status.return_value = {
            'MerchantRequestID': 'merchant-forged',
            'CheckoutRequestID': 'ws_CO_FORGED_SUCCESS',
            'ResultCode': '1032',
            'ResultDesc': 'Request cancelled by user.',
        }
        self.client.post(
            self.stk_push_url,
            {
                'invoice_id': str(invoice.id),
                'phone_number': '254700000000',
            },
            format='json',
        )
        self.client.force_authenticate(user=None)

        response = self.client.post(
            self.callback_url,
            {
                'Body': {
                    'stkCallback': {
                        'MerchantRequestID': 'merchant-forged',
                        'CheckoutRequestID': 'ws_CO_FORGED_SUCCESS',
                        'ResultCode': 0,
                        'ResultDesc': 'The service request is processed successfully.',
                        'CallbackMetadata': {
                            'Item': [
                                {'Name': 'Amount', 'Value': 3500},
                                {'Name': 'MpesaReceiptNumber', 'Value': 'FAKE-RECEIPT'},
                                {'Name': 'PhoneNumber', 'Value': 254700000000},
                            ],
                        },
                    },
                },
            },
            format='json',
        )

        invoice.refresh_from_db()
        stk_request = MpesaSTKRequest.objects.get(checkout_request_id='ws_CO_FORGED_SUCCESS')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invoice.status, Invoice.InvoiceStatus.UNPAID)
        self.assertEqual(stk_request.status, MpesaSTKRequest.RequestStatus.PENDING)
        self.assertFalse(Payment.objects.filter(invoice=invoice).exists())

    def test_driver_cannot_record_payment_directly(self):
        invoice = self.create_invoice(date(2026, 6, 4))

        response = self.client.post(
            reverse('payment-list'),
            {
                'invoice': str(invoice.id),
                'amount': '3500.00',
                'mpesa_receipt': 'FAKE-RECEIPT',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Payment.objects.filter(mpesa_receipt='FAKE-RECEIPT').exists())

    def test_only_admin_can_view_all_mpesa_requests(self):
        invoice = self.create_invoice(date(2026, 6, 4))
        MpesaSTKRequest.objects.create(
            invoice=invoice,
            phone_number='254700000000',
            amount=Decimal('3500.00'),
            checkout_request_id='ws_CO_ADMIN_AUDIT',
        )

        driver_response = self.client.get(reverse('mpesa-request-list'))

        admin = User.objects.create_superuser(
            username='payment-admin',
            password='test-password',
            national_id='55667788',
        )
        self.client.force_authenticate(admin)
        admin_response = self.client.get(reverse('mpesa-request-list'))

        self.assertEqual(driver_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(admin_response.status_code, status.HTTP_200_OK)
        self.assertEqual(admin_response.json()[0]['checkout_request_id'], 'ws_CO_ADMIN_AUDIT')


@override_settings(
    MPESA_SHORTCODE='174379',
    MPESA_PASSKEY='test-passkey',
    MPESA_CALLBACK_URL='https://example.com/api/payments/mpesa-callback/',
)
class MpesaClientTests(SimpleTestCase):
    @patch('apps.payments.services.requests.post')
    @patch.object(MpesaClient, 'get_auth_token', return_value='access-token')
    def test_stk_push_accepts_invoice_id_and_amount_from_latest_unpaid_response(
        self,
        get_auth_token,
        post,
    ):
        reference = uuid4()
        post.return_value.json.return_value = {'ResponseCode': '0'}

        response = MpesaClient.trigger_stk_push(
            phone_number='254700000000',
            amount=Decimal('3500.00'),
            reference=reference,
        )

        get_auth_token.assert_called_once_with()
        payload = post.call_args.kwargs['json']
        self.assertEqual(payload['Amount'], 3500)
        self.assertEqual(payload['AccountReference'], reference.hex[:12])
        self.assertEqual(response, {'ResponseCode': '0'})

    @patch('apps.payments.services.requests.post')
    @patch.object(MpesaClient, 'get_auth_token', return_value='access-token')
    def test_query_stk_status_asks_daraja_for_checkout_request(
        self,
        get_auth_token,
        post,
    ):
        post.return_value.json.return_value = {'ResultCode': '0'}

        response = MpesaClient.query_stk_status('ws_CO_QUERY')

        get_auth_token.assert_called_once_with()
        payload = post.call_args.kwargs['json']
        self.assertEqual(payload['BusinessShortCode'], '174379')
        self.assertEqual(payload['CheckoutRequestID'], 'ws_CO_QUERY')
        self.assertIn('Password', payload)
        self.assertEqual(
            post.call_args.args[0],
            'https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query',
        )
        self.assertEqual(response, {'ResultCode': '0'})

    @patch.object(MpesaClient, 'get_auth_token', return_value='access-token')
    def test_stk_push_rejects_fractional_shilling_amount(self, get_auth_token):
        with self.assertRaisesMessage(
            InvalidMpesaAmount,
            'M-Pesa payments must use whole Kenyan shillings.',
        ):
            MpesaClient.trigger_stk_push(
                phone_number='254700000000',
                amount=Decimal('3500.50'),
                reference=uuid4(),
            )

        get_auth_token.assert_not_called()
