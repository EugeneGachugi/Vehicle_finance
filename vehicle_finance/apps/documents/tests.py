import shutil
import tempfile
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from io import StringIO
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import DriverProfile
from apps.vehicles.models import CarMake, CarModel, Vehicle
from .models import Document, DocumentStatus
from .services import run_expiry_check


User = get_user_model()


class DocumentApiTests(APITestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media_root = tempfile.mkdtemp()
        cls.settings_override = override_settings(
            MEDIA_ROOT=cls.media_root,
            EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend',
        )
        cls.settings_override.enable()

    @classmethod
    def tearDownClass(cls):
        cls.settings_override.disable()
        shutil.rmtree(cls.media_root, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='document-admin',
            password='test-password',
            national_id='DOC-ADMIN',
        )
        self.driver_user = User.objects.create_user(
            username='document-driver',
            password='test-password',
            national_id='DOC-DRIVER',
            email='driver@example.com',
        )
        self.driver = DriverProfile.objects.create(
            user=self.driver_user,
            kra_pin='A123456789D',
            dl_number='DL-DOCUMENT',
        )
        make = CarMake.objects.create(make='Toyota')
        model = CarModel.objects.create(make=make, name='Probox')
        self.vehicle = Vehicle.objects.create(
            plate_number='KDD 001D',
            model=model,
            yom=2020,
            chasis_number='DOC-CHASSIS',
            engine_number='DOC-ENGINE',
            color='White',
            valuation='1000000.00',
            driver=self.driver,
        )
        self.client.force_authenticate(self.admin)

    def upload_file(self, name='document.pdf'):
        return SimpleUploadedFile(name, b'document-content', content_type='application/pdf')

    def create_document(self, target, **overrides):
        defaults = {
            'content_type': ContentType.objects.get_for_model(target),
            'object_id': str(target.pk),
            'doc_type': 'IF',
            'file': self.upload_file(),
        }
        defaults.update(overrides)
        return Document.objects.create(**defaults)

    def test_admin_uploads_driver_document_using_driver_user_uuid(self):
        response = self.client.post(
            reverse('driver-document-upload', kwargs={'driver_id': self.driver_user.id}),
            {'doc_type': 'IF', 'file': self.upload_file()},
            format='multipart',
        )

        document = Document.objects.get()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(document.content_object, self.driver)
        self.assertEqual(document.object_id, str(self.driver.pk))
        self.assertEqual(document.status, DocumentStatus.PENDING)
        self.assertEqual(response.json()['target_type'], 'driverprofile')
        self.assertTrue(response.json()['file'].startswith('http://testserver/media/'))

    def test_admin_uploads_vehicle_document_and_can_list_target_documents(self):
        upload_response = self.client.post(
            reverse('vehicle-document-upload', kwargs={'vehicle_id': self.vehicle.id}),
            {
                'doc_type': 'IN',
                'expiry_date': str(timezone.localdate() + timedelta(days=30)),
                'file': self.upload_file('insurance.pdf'),
            },
            format='multipart',
        )
        list_response = self.client.get(
            reverse('vehicle-documents', kwargs={'vehicle_id': self.vehicle.id}),
        )

        self.assertEqual(upload_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Document.objects.get().content_object, self.vehicle)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.json()), 1)

    def test_upload_requires_expiry_date_for_expiring_document_type(self):
        response = self.client.post(
            reverse('driver-document-upload', kwargs={'driver_id': self.driver_user.id}),
            {'doc_type': 'DL', 'file': self.upload_file()},
            format='multipart',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expiry_date', response.json())
        self.assertFalse(Document.objects.exists())

    def test_upload_and_review_are_admin_only(self):
        document = self.create_document(self.driver)
        self.client.force_authenticate(self.driver_user)

        upload_response = self.client.post(
            reverse('driver-document-upload', kwargs={'driver_id': self.driver_user.id}),
            {'doc_type': 'IF', 'file': self.upload_file('second.pdf')},
            format='multipart',
        )
        review_response = self.client.post(
            reverse('document-review', kwargs={'pk': document.pk}),
            {'status': 'VR'},
            format='json',
        )

        self.assertEqual(upload_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(review_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_review_validates_status_and_returns_updated_document(self):
        document = self.create_document(self.driver)
        review_url = reverse('document-review', kwargs={'pk': document.pk})

        invalid_response = self.client.post(review_url, {'status': 'EX'}, format='json')
        valid_response = self.client.post(review_url, {'status': 'VR'}, format='json')

        document.refresh_from_db()
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(valid_response.status_code, status.HTTP_200_OK)
        self.assertEqual(valid_response.json()['status'], DocumentStatus.VERIFIED)
        self.assertEqual(document.status, DocumentStatus.VERIFIED)

    def test_driver_lists_own_driver_and_vehicle_documents(self):
        own_driver_document = self.create_document(self.driver)
        own_vehicle_document = self.create_document(self.vehicle, file=self.upload_file('vehicle.pdf'))
        self.client.force_authenticate(self.driver_user)

        response = self.client.get(reverse('document-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            {document['id'] for document in response.json()},
            {own_driver_document.id, own_vehicle_document.id},
        )

    def test_user_without_driver_profile_gets_empty_document_list(self):
        user = User.objects.create_user(
            username='no-profile',
            password='test-password',
            national_id='NO-PROFILE',
        )
        self.client.force_authenticate(user)

        response = self.client.get(reverse('document-list'))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json(), [])

    def test_expiry_check_marks_expired_and_sends_upcoming_warning(self):
        today = timezone.localdate()
        expired = self.create_document(
            self.driver,
            doc_type='DL',
            expiry_date=today - timedelta(days=1),
            status=DocumentStatus.PENDING,
        )
        upcoming = self.create_document(
            self.driver,
            doc_type='DL',
            expiry_date=today + timedelta(days=5),
            status=DocumentStatus.VERIFIED,
            file=self.upload_file('upcoming.pdf'),
        )

        summary = run_expiry_check()

        expired.refresh_from_db()
        upcoming.refresh_from_db()
        self.assertEqual(expired.status, DocumentStatus.EXPIRED)
        self.assertEqual(upcoming.status, DocumentStatus.VERIFIED)
        self.assertEqual(summary, {
            'expired_count': 1,
            'warning_count': 1,
            'notifications_sent': 1,
        })
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn('Expiring Soon', mail.outbox[0].subject)

    def test_expiry_management_command_prints_summary(self):
        output = StringIO()

        call_command('check_document_expiry', stdout=output)

        self.assertIn('Document expiry check complete', output.getvalue())
