from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser, IsAuthenticated, SAFE_METHODS
from .models import Vehicle, CarMake, CarModel
from .serializers import VehicleSerializer, CarMakeSerializer, CarModelSerializer


def admin_write_permissions(view):
    if view.request.method in SAFE_METHODS:
        return [IsAuthenticated()]
    return [IsAdminUser()]


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class=VehicleSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        return admin_write_permissions(self)

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return Vehicle.objects.all()
        return Vehicle.objects.filter(driver__user=user)


class CarMakeViewSet(viewsets.ModelViewSet):
    serializer_class = CarMakeSerializer
    permission_classes = [IsAuthenticated]
    queryset = CarMake.objects.all()

    def get_permissions(self):
        return admin_write_permissions(self)


class CarModelViewSet(viewsets.ModelViewSet):
    serializer_class = CarModelSerializer
    permission_classes = [IsAuthenticated]
    queryset = CarModel.objects.select_related('make').all()

    def get_permissions(self):
        return admin_write_permissions(self)
