
from django.contrib import admin
from .models import FinancingContract, Invoice, MpesaSTKRequest, Payment

@admin.register(FinancingContract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ('id', 'driver', 'status', 'weeks_paid', 'billing_day')
    list_filter = ('status', 'billing_day')
    search_fields = ('driver__user__username', 'id')

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('id', 'contract', 'due_date', 'amount_due', 'status')
    list_filter = ('status', 'due_date')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('mpesa_receipt', 'invoice', 'amount', 'created_at')
    search_fields = ('mpesa_receipt', 'invoice__id')


@admin.register(MpesaSTKRequest)
class MpesaSTKRequestAdmin(admin.ModelAdmin):
    list_display = (
        'checkout_request_id',
        'invoice',
        'phone_number',
        'amount',
        'status',
        'created_at',
    )
    list_filter = ('status', 'created_at')
    search_fields = (
        'checkout_request_id',
        'merchant_request_id',
        'invoice__id',
        'phone_number',
    )
    readonly_fields = (
        'invoice',
        'phone_number',
        'amount',
        'merchant_request_id',
        'checkout_request_id',
        'status',
        'result_code',
        'result_description',
        'mpesa_receipt',
        'callback_payload',
        'created_at',
        'updated_at',
        'completed_at',
    )
