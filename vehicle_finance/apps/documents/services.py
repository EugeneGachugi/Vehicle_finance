from django.utils import timezone
from .models import Document, DocumentStatus
from datetime import timedelta
from django.core.mail import send_mail

def send_expiry_notification(user, document):
    subject = f"Action Required: {document.get_doc_type_display()} Expiring Soon"
    message = (
        f"Hello {user.first_name},\n\n"
        f"Your {document.get_doc_type_display()} is set to expire on {document.expiry_date}. "
        "Please upload a renewed document to avoid service interruption."
    )
    send_mail(
        subject,
        message,
        'system@gmail.com',
        [user.email],
        fail_silently=False,
    )

def run_expiry_check():
    today = timezone.now().date()
    warning_threshold = today + timedelta(days=7)

    expired_docs = Document.objects.filter(
        expiry_date__lt=today,
        status__in=[DocumentStatus.VERIFIED, DocumentStatus.PENDING]
    )
    count=expired_docs.update(status=DocumentStatus.EXPIRED)
    upcoming_expiries = Document.objects.filter(
        expiry_date=warning_threshold,
        status=DocumentStatus.VERIFIED, 
    )
    for doc in upcoming_expiries:
        owner = doc.content_object

        if hasattr(owner, 'user'):
            send_expiry_notification(owner.user, doc)

        elif hasattr(owner, 'driver') and owner.driver:
            send_expiry_notification(owner.driver.user, doc)
        
    return count, upcoming_expiries.count()
