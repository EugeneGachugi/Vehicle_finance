from rest_framework import serializers
from .models import FinancingContract, Invoice, Payment

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
