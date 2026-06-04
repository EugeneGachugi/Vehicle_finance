from django.core.management.base import BaseCommand

from apps.documents.services import run_expiry_check


class Command(BaseCommand):
    help = 'Mark expired documents and notify owners about documents expiring within seven days.'

    def handle(self, *args, **options):
        summary = run_expiry_check()
        self.stdout.write(
            self.style.SUCCESS(
                'Document expiry check complete: '
                f"{summary['expired_count']} expired, "
                f"{summary['warning_count']} warnings, "
                f"{summary['notifications_sent']} notifications sent."
            )
        )
