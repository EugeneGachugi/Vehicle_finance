import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import Document, DocumentStatus


logger = logging.getLogger(__name__)


def get_document_owner_user(document):
    owner = document.content_object
    if owner is None:
        return None

    if hasattr(owner, 'user'):
        return owner.user

    driver = getattr(owner, 'driver', None)
    return getattr(driver, 'user', None)


def send_expiry_notification(user, document):
    if user is None or not user.email:
        logger.info(
            'Document %s (%s) expires on %s, but no owner email is available.',
            document.pk,
            document.get_doc_type_display(),
            document.expiry_date,
        )
        return False

    subject = f"Action Required: {document.get_doc_type_display()} Expiring Soon"
    message = (
        f"Hello {user.first_name or user.username},\n\n"
        f"Your {document.get_doc_type_display()} is set to expire on {document.expiry_date}. "
        "Please contact the office with a renewed document to avoid service interruption."
    )

    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception(
            'Could not send expiry warning for document %s to %s.',
            document.pk,
            user.email,
        )
        return False

    return True


def run_expiry_check():
    today = timezone.localdate()
    warning_threshold = today + timedelta(days=7)

    expired_count = Document.objects.filter(
        expiry_date__lt=today,
        status__in=[DocumentStatus.VERIFIED, DocumentStatus.PENDING],
    ).update(status=DocumentStatus.EXPIRED)

    upcoming_expiries = Document.objects.filter(
        expiry_date__gte=today,
        expiry_date__lte=warning_threshold,
        status=DocumentStatus.VERIFIED,
    ).select_related('content_type')

    warning_count = 0
    notifications_sent = 0
    for document in upcoming_expiries:
        warning_count += 1
        if send_expiry_notification(get_document_owner_user(document), document):
            notifications_sent += 1

    return {
        'expired_count': expired_count,
        'warning_count': warning_count,
        'notifications_sent': notifications_sent,
    }
