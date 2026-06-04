import logging
from decimal import Decimal, InvalidOperation

import requests
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, SAFE_METHODS
from rest_framework.views import APIView
from .models import FinancingContract, Invoice, MpesaSTKRequest, Payment
from .serializers import (
    FinancingContractSerializer,
    InvoiceSerializer,
    LatestUnpaidInvoiceSerializer,
    MpesaSTKRequestSerializer,
    PaymentSerializer,
    STKPushSerializer,
)
from .services import InvalidMpesaAmount, MpesaClient, normalize_mpesa_amount, process_payment_logic


logger = logging.getLogger(__name__)


def admin_write_permissions(view):
    if view.request.method in SAFE_METHODS:
        return [IsAuthenticated()]
    return [IsAdminUser()]


class FinancingContractViewSet(viewsets.ModelViewSet):
    serializer_class = FinancingContractSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return admin_write_permissions(self)

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return FinancingContract.objects.all()
        return FinancingContract.objects.filter(driver__user=user)

class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class=InvoiceSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return admin_write_permissions(self)

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Invoice.objects.all()
        return Invoice.objects.filter(contract__driver__user=user)

    @action(detail=False, methods=['get'], url_path='latest-unpaid')
    def latest_unpaid(self, request):
        invoice = (
            Invoice.objects.filter(
                contract__driver__user=request.user,
                status__in=[
                    Invoice.InvoiceStatus.UNPAID,
                    Invoice.InvoiceStatus.PARTIAL,
                ],
            )
            .order_by('-due_date')
            .first()
        )

        if invoice is None:
            return Response(
                {'detail': 'No unpaid invoice found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(LatestUnpaidInvoiceSerializer(invoice).data)


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return admin_write_permissions(self)

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Payment.objects.all()
        return Payment.objects.filter(invoice__contract__driver__user=user)

    def create(self, request, *args, **kwargs):
        serializer=self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invoice_obj = serializer.validated_data['invoice']
        amount = serializer.validated_data['amount']
        mpesa_code = serializer.validated_data['mpesa_receipt']

        payment = process_payment_logic(invoice_obj, amount, mpesa_code)

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class MpesaSTKRequestViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = MpesaSTKRequestSerializer
    permission_classes = [IsAdminUser]
    queryset = MpesaSTKRequest.objects.select_related('invoice').order_by('-created_at')


class MpesaSTKPushView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = STKPushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        invoice = Invoice.objects.filter(
            id=serializer.validated_data['invoice_id'],
            contract__driver__user=request.user,
        ).first()

        if invoice is None:
            return Response(
                {'detail': 'Invoice could not be found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        amount_outstanding = invoice.amount_due - invoice.amount_paid
        if invoice.status in (Invoice.InvoiceStatus.PAID, Invoice.InvoiceStatus.OVERPAID) or amount_outstanding <= 0:
            return Response(
                {'detail': 'This invoice has already been paid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            mpesa_amount = normalize_mpesa_amount(amount_outstanding)
        except InvalidMpesaAmount as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            mpesa_response = MpesaClient.trigger_stk_push(
                phone_number=serializer.validated_data['phone_number'],
                amount=mpesa_amount,
                reference=invoice.id,
            )
        except requests.RequestException:
            logger.exception('M-Pesa STK push failed for invoice %s', invoice.id)
            return Response(
                {'detail': 'M-Pesa could not initiate the payment request. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        checkout_request_id = mpesa_response.get('CheckoutRequestID')
        merchant_request_id = mpesa_response.get('MerchantRequestID')
        if not checkout_request_id or not merchant_request_id:
            logger.error('M-Pesa returned incomplete request IDs for invoice %s', invoice.id)
            return Response(
                {'detail': 'M-Pesa did not accept the payment request. Please try again.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        stk_request = MpesaSTKRequest.objects.create(
            invoice=invoice,
            phone_number=serializer.validated_data['phone_number'],
            amount=mpesa_amount,
            merchant_request_id=merchant_request_id,
            checkout_request_id=checkout_request_id,
        )

        demo_completed = False
        if settings.MPESA_DEMO_AUTO_COMPLETE:
            demo_receipt = f"DEMO-{str(invoice.id).replace('-', '')[:12]}-{timezone.now():%H%M%S}"
            process_payment_logic(invoice, mpesa_amount, demo_receipt)
            invoice.refresh_from_db()
            stk_request.status = MpesaSTKRequest.RequestStatus.SUCCESS
            stk_request.result_code = '0'
            stk_request.result_description = 'Demo payment completed.'
            stk_request.mpesa_receipt = demo_receipt
            stk_request.completed_at = timezone.now()
            stk_request.save(
                update_fields=[
                    'status',
                    'result_code',
                    'result_description',
                    'mpesa_receipt',
                    'completed_at',
                    'updated_at',
                ]
            )
            demo_completed = True

        return Response(
            {
                'message': (
                    'Demo payment completed.'
                    if demo_completed
                    else 'STK push sent. Check your phone and enter your M-Pesa PIN.'
                ),
                'invoice_id': str(invoice.id),
                'invoice_status': invoice.status,
                'amount': mpesa_amount,
                'payment_request_id': str(stk_request.id),
                'demo_completed': demo_completed,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class MpesaPaymentStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payment_request_id = request.query_params.get('payment_request_id')
        invoice_id = request.query_params.get('invoice_id')

        stk_requests = MpesaSTKRequest.objects.filter(
            invoice__contract__driver__user=request.user,
        ).select_related('invoice')

        if payment_request_id:
            stk_request = stk_requests.filter(id=payment_request_id).first()
        elif invoice_id:
            stk_request = stk_requests.filter(invoice_id=invoice_id).order_by('-created_at').first()
        else:
            return Response(
                {'detail': 'Provide payment_request_id or invoice_id.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if stk_request is None:
            return Response(
                {'detail': 'Payment request could not be found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                'invoice_id': str(stk_request.invoice_id),
                'invoice_status': stk_request.invoice.status,
                'payment_status': stk_request.status,
                'amount': stk_request.amount,
                'payment_request_id': str(stk_request.id),
                'result_code': stk_request.result_code or None,
                'result_description': stk_request.result_description or None,
                'mpesa_receipt': stk_request.mpesa_receipt or None,
            }
        )


class MpesaCallbackView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        callback = request.data.get('Body', {}).get('stkCallback', {})
        checkout_request_id = callback.get('CheckoutRequestID')
        merchant_request_id = callback.get('MerchantRequestID')

        if not checkout_request_id or not merchant_request_id:
            return Response(
                {'ResultCode': 1, 'ResultDesc': 'MerchantRequestID and CheckoutRequestID are required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stk_request = MpesaSTKRequest.objects.filter(
            checkout_request_id=checkout_request_id,
        ).first()

        if stk_request is None:
            logger.warning('Received callback for unknown checkout request %s', checkout_request_id)
            return Response(
                {'ResultCode': 1, 'ResultDesc': 'Payment request could not be found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if merchant_request_id != stk_request.merchant_request_id:
            logger.warning('Received callback with invalid merchant request ID for %s', checkout_request_id)
            return Response(
                {'ResultCode': 1, 'ResultDesc': 'MerchantRequestID is invalid.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if stk_request.status != MpesaSTKRequest.RequestStatus.PENDING:
            return Response({'ResultCode': 0, 'ResultDesc': 'Callback already processed.'})

        result_code = str(callback.get('ResultCode', ''))
        try:
            verification = MpesaClient.query_stk_status(checkout_request_id)
        except requests.RequestException:
            logger.exception('Could not verify M-Pesa callback for %s', checkout_request_id)
            return Response(
                {'ResultCode': 1, 'ResultDesc': 'Payment verification is temporarily unavailable.'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        verification_result_code = str(verification.get('ResultCode', ''))
        verification_is_valid = (
            verification.get('CheckoutRequestID') == checkout_request_id
            and verification.get('MerchantRequestID') == merchant_request_id
            and verification_result_code == result_code
        )
        if not verification_is_valid:
            logger.warning('Daraja verification did not match callback for %s', checkout_request_id)
            return Response(
                {'ResultCode': 1, 'ResultDesc': 'Payment callback could not be verified.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            stk_request = (
                MpesaSTKRequest.objects.select_for_update()
                .select_related('invoice')
                .filter(checkout_request_id=checkout_request_id)
                .first()
            )

            if stk_request is None:
                return Response(
                    {'ResultCode': 1, 'ResultDesc': 'Payment request could not be found.'},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if stk_request.status != MpesaSTKRequest.RequestStatus.PENDING:
                return Response({'ResultCode': 0, 'ResultDesc': 'Callback already processed.'})

            result_description = callback.get('ResultDesc', '')
            stk_request.callback_payload = request.data
            stk_request.result_code = result_code
            stk_request.result_description = result_description
            stk_request.completed_at = timezone.now()

            if result_code != '0':
                stk_request.status = MpesaSTKRequest.RequestStatus.FAILED
                stk_request.save()
                return Response({'ResultCode': 0, 'ResultDesc': 'Callback accepted.'})

            metadata_items = callback.get('CallbackMetadata', {}).get('Item', [])
            metadata = {
                item.get('Name'): item.get('Value')
                for item in metadata_items
                if item.get('Name')
            }
            receipt = metadata.get('MpesaReceiptNumber')
            callback_phone = str(metadata.get('PhoneNumber', ''))

            try:
                callback_amount = Decimal(str(metadata.get('Amount')))
            except (InvalidOperation, TypeError):
                callback_amount = None

            if (
                not receipt
                or callback_amount != stk_request.amount
                or (callback_phone and callback_phone != stk_request.phone_number)
            ):
                stk_request.status = MpesaSTKRequest.RequestStatus.FAILED
                stk_request.result_description = 'Successful callback had invalid receipt, amount, or phone number.'
                stk_request.save()
                logger.error('Invalid successful callback for checkout request %s', checkout_request_id)
                return Response(
                    {'ResultCode': 1, 'ResultDesc': 'Callback payment details were invalid.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            existing_payment = Payment.objects.filter(mpesa_receipt=receipt).first()
            if existing_payment is not None and existing_payment.invoice_id != stk_request.invoice_id:
                stk_request.status = MpesaSTKRequest.RequestStatus.FAILED
                stk_request.result_description = 'M-Pesa receipt is already attached to another invoice.'
                stk_request.save()
                logger.error('Receipt conflict for checkout request %s', checkout_request_id)
                return Response(
                    {'ResultCode': 1, 'ResultDesc': 'M-Pesa receipt conflict.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if existing_payment is None:
                invoice = Invoice.objects.select_for_update().get(id=stk_request.invoice_id)
                process_payment_logic(invoice, callback_amount, receipt)

            stk_request.status = MpesaSTKRequest.RequestStatus.SUCCESS
            stk_request.mpesa_receipt = receipt
            stk_request.save()

        return Response({'ResultCode': 0, 'ResultDesc': 'Callback accepted.'})
