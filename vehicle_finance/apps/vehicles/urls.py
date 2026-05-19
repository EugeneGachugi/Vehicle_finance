from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet, CarMakeViewSet, CarModelViewSet

router = DefaultRouter()
router.register(r'fleet', VehicleViewSet, basename = 'vehicle')
router.register(r'makes', CarMakeViewSet, basename = 'car-make')
router.register(r'models', CarModelViewSet, basename = 'car-model')

urlpatterns = [
    path('', include(router.urls))
]
