from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import DriverProfile


User = get_user_model()


class DriverOnboardingFormTests(APITestCase):
    def test_driver_form_fields_create_user_and_profile(self):
        response = self.client.post(
            reverse('onboard'),
            {
                'username': 'janedoe',
                'email': 'jane@example.com',
                'first_name': 'Jane',
                'last_name': 'Doe',
                'password': 'strong-test-password',
                'national_id': 'DRIVER-FORM-001',
                'profile_details': {
                    'kra_pin': 'A123456789U',
                    'dl_number': 'DL-USER-FORM',
                },
            },
            format='json',
        )

        user = User.objects.get(username='janedoe')
        profile = DriverProfile.objects.get(user=user)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(user.first_name, 'Jane')
        self.assertEqual(user.last_name, 'Doe')
        self.assertEqual(user.email, 'jane@example.com')
        self.assertTrue(user.check_password('strong-test-password'))
        self.assertEqual(profile.kra_pin, 'A123456789U')
        self.assertEqual(profile.dl_number, 'DL-USER-FORM')
