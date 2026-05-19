
from django.contrib import admin
from .models import FinancingContract, Invoice, Payment

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