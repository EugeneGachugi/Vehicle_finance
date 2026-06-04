from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.users.models import DriverProfile
from .models import CarMake, CarModel, Vehicle


User = get_user_model()


class VehicleAdminFormApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='fleet-admin',
            password='test-password',
            national_id='FLEET-ADMIN',
        )
        self.driver_user = User.objects.create_user(
            username='fleet-driver',
            password='test-password',
            national_id='FLEET-DRIVER',
        )
        self.driver = DriverProfile.objects.create(
            user=self.driver_user,
            kra_pin='A123456789V',
            dl_number='DL-VEHICLE',
        )

    def test_admin_can_create_make_model_and_vehicle_with_form_fields(self):
        self.client.force_authenticate(self.admin)

        make_response = self.client.post(reverse('car-make-list'), {'make': 'Toyota'}, format='json')
        model_response = self.client.post(
            reverse('car-model-list'),
            {'make': make_response.json()['id'], 'name': 'Probox'},
            format='json',
        )
        vehicle_response = self.client.post(
            reverse('vehicle-list'),
            {
                'plate_number': 'KAA 001V',
                'model': model_response.json()['id'],
                'yom': 2020,
                'chasis_number': 'VEHICLE-CHASSIS',
                'engine_number': 'VEHICLE-ENGINE',
                'color': 'White',
                'valuation': '1000000.00',
                'status': 'AV',
            },
            format='json',
        )

        self.assertEqual(make_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(model_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(model_response.json()['make'], make_response.json()['id'])
        self.assertEqual(vehicle_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(vehicle_response.json()['plate_number'], 'KAA 001V')

    def test_driver_can_read_catalog_and_own_vehicle_but_cannot_write(self):
        make = CarMake.objects.create(make='Toyota')
        model = CarModel.objects.create(make=make, name='Probox')
        Vehicle.objects.create(
            plate_number='KAA 002V',
            model=model,
            yom=2020,
            chasis_number='OWN-CHASSIS',
            engine_number='OWN-ENGINE',
            color='White',
            valuation=Decimal('1000000.00'),
            driver=self.driver,
        )
        self.client.force_authenticate(self.driver_user)

        makes_response = self.client.get(reverse('car-make-list'))
        vehicles_response = self.client.get(reverse('vehicle-list'))
        write_response = self.client.post(reverse('car-make-list'), {'make': 'Honda'}, format='json')

        self.assertEqual(makes_response.status_code, status.HTTP_200_OK)
        self.assertEqual(vehicles_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(vehicles_response.json()), 1)
        self.assertEqual(write_response.status_code, status.HTTP_403_FORBIDDEN)
