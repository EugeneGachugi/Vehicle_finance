from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid


class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, )

    class Role(models.TextChoices):
        DRIVER = 'DRIVER','Driver'
        FLEET_MANAGER = 'FLEET_MANAGER', 'Fleet Manager'
        ADMIN = 'ADMIN' , 'Admin'

    role=models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.DRIVER
    )
    national_id=models.CharField(
        max_length=20,
        unique=True,
        blank=True,
    )
    REQUIRED_FIELDS = ['national_id']

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"

class DriverProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='driver_profile', primary_key=True)
    
    
    kra_pin=models.CharField(
        max_length=20,
        unique=True,
        )
    
    dl_number=models.CharField(
        max_length=50,
        unique=True,
    )
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        VERIFIED = 'VERIFIED' , 'Verified'
        REJECTED = 'REJECTED' , 'Rejected'

    user=models.OneToOneField(User, on_delete=models.CASCADE, related_name='driver_profile')
    verification_status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.PENDING
    )



    def __str__(self):
        return f"Driver Profile for {self.user.username}"
    pass


