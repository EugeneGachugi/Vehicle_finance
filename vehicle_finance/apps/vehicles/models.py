from django.db import models
import datetime
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid

class VehicleStatus(models.TextChoices):
    AVAILABLE='AV','Available'
    FINANCED='FI','Financed'
    OUT_OF_SERVICE='OS', 'Out of Service'
    IMMOBILIZED='IM', 'Immobilized'

class CarMake(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    make=models.CharField(max_length=40)

class CarModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    make=models.ForeignKey(CarMake, on_delete=models.CASCADE)
    name=models.CharField(max_length=40)

    
class Vehicle(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, )
    plate_number = models.CharField(max_length=30)
    model = models.ForeignKey(CarModel, on_delete = models.CASCADE)
    yom = models.PositiveSmallIntegerField(
        validators=[
            MinValueValidator(1975),
            MaxValueValidator(datetime.date.today().year)
        ]
    )
    chasis_number=models.CharField(max_length=30)
    engine_number=models.CharField(max_length=30)
    color=models.CharField(max_length=20)
    valuation=models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(
        max_length=2,
        choices=VehicleStatus.choices,
        default=VehicleStatus.AVAILABLE
    )
    driver = models.ForeignKey(
        'users.DriverProfile',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    def __str__(self):
        return f"{self.model.name} ({self.plate_number})"

    @property
    def full_vehicle_name(self):
        return f"{self.model.make.make} {self.model.name}"
