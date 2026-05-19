from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError

class DocumentStatus(models.TextChoices):
    PENDING = 'PN', 'Pending'
    VERIFIED = 'VR', 'Verified'
    REJECTED = 'RJ', 'Rejected'
    EXPIRED = 'EX', 'Expired'

class DocumentType(models.TextChoices):
    IDENTIFICATION_CARD_FRONT = 'IF', 'ID Front'
    IDENTIFICATION_CARD_BACK = 'IB', 'ID Back'
    DRIVING_LICENSE = 'DL', 'Driving License'
    KRA_PIN = 'KR', 'KRA Pin'
    LOGBOOK = 'LB', 'Logbook'
    INSURANCE = 'IN', 'Insurance'
    PSV_BADGE = 'PB', 'PSV Badge'
    INSPECTION_REPORT = 'IP', 'Inspection Report'

class Document(models.Model):
    doc_type = models.CharField(max_length=2, choices=DocumentType.choices)
    status = models.CharField(max_length=2, choices=DocumentStatus.choices)
    file = models.FileField(upload_to='uploads/%Y/%m/%d/')
    expiry_date=models.DateField(null=True, blank=True)

    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    def clean(self):
        expiring_types = [
            DocumentType.DRIVING_LICENSE, 
            DocumentType.INSURANCE, 
            DocumentType.PSV_BADGE, 
            DocumentType.INSPECTION_REPORT,
            DocumentType.LOGBOOK
        ]

        if self.doc_type in expiring_types and not self.expiry_date:
            raise ValidationError({
                'expiry_date': f"An expiry date is required for {self.get_doc_type_display()}."
            })
        
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.get_doc_type_display()} - {self.status}"