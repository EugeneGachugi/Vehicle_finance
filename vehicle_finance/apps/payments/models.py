from django.db import models
import uuid
from django.core.validators import MinValueValidator
from apps.users.models import DriverProfile
from apps.vehicles.models import Vehicle

# Create your models here.
class FinancingContract(models.Model):
    class ContractStatus(models.TextChoices):
        DRAFT = 'DR', 'Draft'
        ACTIVE = 'AC', 'Active'
        COMPLETED = 'CM', 'Completed'
        DEFAULTED = 'DF', 'Defaulted'

    class PaymentDay(models.TextChoices):
        MON = 'MON', 'Monday'
        TUE = 'TUE', 'Tuesday'
        WED = 'WED', 'Wednesday'
        THU = 'THU', 'Thursday'
        FRI = 'FRI', 'Friday'
        SAT = 'SAT', 'Saturday'
        SUN = 'SUN', "Sunday"

    id=models.UUIDField(primary_key=True, default=uuid.uuid4,editable=False)
    #linking drivers and vehicles to contract via foreign keys from their from django.db import models
    driver=models.ForeignKey(
        DriverProfile,
        on_delete=models.PROTECT,
        related_name='contracts'  
    )
    vehicle=models.ForeignKey(
        Vehicle,
        on_delete=models.PROTECT,
        related_name='financing_plans'
    )
    #vehicle financial details
    vehicle_valuation=models.DecimalField(max_digits=10, decimal_places=2)
    interest_rate=models.DecimalField(max_digits=4, decimal_places=2)
    total_repayment=models.DecimalField(max_digits=10, decimal_places=2)

    #Payment schedule
    weekly_installment=models.DecimalField(max_digits=10,decimal_places=2)
    total_weeks = models.IntegerField()
    weeks_paid=models.IntegerField(default=0)

    #overpayment handling
    prepayment_balance=models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)]
        )

    #status
    status = models.CharField(
        max_length=10,
        choices=ContractStatus.choices,
        default=ContractStatus.DRAFT
    )
    billing_day=models.CharField(
        max_length=3,
        choices=PaymentDay.choices,
        default=PaymentDay.MON
    )
    created_at=models.DateTimeField(auto_now_add=True)
    updated_at=models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Contract {str(self.id)[:8]} - {self.status}"
    

class Invoice(models.Model):
    class InvoiceStatus(models.TextChoices):
        UNPAID = 'UNPAID', 'Unpaid'
        PAID = 'PAID', 'Paid'
        PARTIAL = 'PARTIAL', 'Partially Paid'
        OVERPAID = 'OVERPAID', 'Overpaid'
    
    id=models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )
    contract=models.ForeignKey(
        FinancingContract,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    amount_due=models.DecimalField(max_digits=10,decimal_places=2,default=0.00)
    amount_paid = models.DecimalField(max_digits=10,decimal_places=2, default=0.00)

    due_date=models.DateField()
    status = models.CharField(
        max_length=10,
        choices=InvoiceStatus.choices,
        default=InvoiceStatus.UNPAID
    )
    def __str__(self):
        return f"Invoice {str(self.id)[:8]} for Contract {self.id}"
    
class Payment(models.Model):
    payment_id=models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice=models.ForeignKey(
        Invoice, 
        on_delete=models.CASCADE,
        related_name= 'payments'
    )
    amount=models.DecimalField(max_digits=10, decimal_places=2)
    mpesa_receipt=models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)


class MpesaSTKRequest(models.Model):
    class RequestStatus(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        SUCCESS = 'SUCCESS', 'Successful'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='stk_requests',
    )
    phone_number = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    merchant_request_id = models.CharField(max_length=100, blank=True)
    checkout_request_id = models.CharField(max_length=100, unique=True)
    status = models.CharField(
        max_length=10,
        choices=RequestStatus.choices,
        default=RequestStatus.PENDING,
    )
    result_code = models.CharField(max_length=20, blank=True)
    result_description = models.TextField(blank=True)
    mpesa_receipt = models.CharField(max_length=50, blank=True)
    callback_payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"STK {self.checkout_request_id} - {self.status}"
