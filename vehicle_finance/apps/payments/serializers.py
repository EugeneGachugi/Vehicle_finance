from rest_framework import serializers
from .models import FinancingContract, Invoice, MpesaSTKRequest, Payment

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['payment_id', 'invoice', 'amount', 'mpesa_receipt', 'created_at']
        read_only_fields = ['payment_id', 'created_at']

class InvoiceSerializer(serializers.ModelSerializer):
    payments = PaymentSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'contract', 'amount_due', 'amount_paid', 
            'due_date', 'status', 'status_display', 'payments'
        ]
        read_only_fields = ['id', 'amount_paid', 'status']


class LatestUnpaidInvoiceSerializer(serializers.ModelSerializer):
    invoice_id = serializers.UUIDField(source='id', read_only=True)
    amount_due = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=False,
        read_only=True,
    )
    amount_paid = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        coerce_to_string=False,
        read_only=True,
    )

    class Meta:
        model = Invoice
        fields = ['invoice_id', 'amount_due', 'amount_paid', 'status']


class STKPushSerializer(serializers.Serializer):
    invoice_id = serializers.UUIDField()
    phone_number = serializers.CharField(max_length=20)

    def validate_phone_number(self, value):
        phone_number = value.replace(' ', '').replace('-', '').lstrip('+')

        if phone_number.startswith('0'):
            phone_number = f'254{phone_number[1:]}'
        elif phone_number.startswith(('7', '1')):
            phone_number = f'254{phone_number}'

        if (
            len(phone_number) != 12
            or not phone_number.isdigit()
            or not phone_number.startswith(('2547', '2541'))
        ):
            raise serializers.ValidationError(
                'Enter a valid Kenyan M-Pesa number, for example 2547XXXXXXXX.'
            )

        return phone_number


class MpesaSTKRequestSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = MpesaSTKRequest
        fields = [
            'id',
            'invoice',
            'phone_number',
            'amount',
            'merchant_request_id',
            'checkout_request_id',
            'status',
            'status_display',
            'result_code',
            'result_description',
            'mpesa_receipt',
            'created_at',
            'completed_at',
        ]
        read_only_fields = fields


class FinancingContractSerializer(serializers.ModelSerializer):
    invoices = InvoiceSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    billing_day_display = serializers.CharField(source='get_billing_day_display', read_only=True)

    class Meta:
        model = FinancingContract
        fields = [
            'id', 'driver', 'vehicle', 'vehicle_valuation', 
            'interest_rate', 'total_repayment', 'weekly_installment', 
            'total_weeks', 'weeks_paid', 'prepayment_balance', 
            'status', 'status_display', 'billing_day', 'billing_day_display', 
            'created_at', 'updated_at', 'invoices'
        ]
        read_only_fields = ['id', 'weeks_paid', 'prepayment_balance', 'created_at', 'updated_at']
