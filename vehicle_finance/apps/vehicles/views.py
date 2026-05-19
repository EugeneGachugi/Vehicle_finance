from django.shortcuts import render
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Vehicle, CarMake, CarModel
from .serializers import VehicleSerializer, CarMakeSerializer, CarModelSerializer

class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class=VehicleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user

        if user.is_staff:
            return Vehicle.objects.all()
        return Vehicle.objects.filter(driver__user=user)


class CarMakeViewSet(viewsets.ModelViewSet):
    serializer_class = CarMakeSerializer
    permission_classes = [IsAuthenticated]
    queryset = CarMake.objects.all()


class CarModelViewSet(viewsets.ModelViewSet):
    serializer_class = CarModelSerializer
    permission_classes = [IsAuthenticated]
    queryset = CarModel.objects.select_related('make').all()
