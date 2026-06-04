from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DocumentViewSet, DriverDocumentView, VehicleDocumentView

router = DefaultRouter()
router.register(r'files', DocumentViewSet, basename='document')

urlpatterns = [
    path('driver/<uuid:driver_id>/', DriverDocumentView.as_view(), name='driver-documents'),
    path('driver/<uuid:driver_id>/upload/', DriverDocumentView.as_view(), name='driver-document-upload'),
    path('vehicle/<uuid:vehicle_id>/', VehicleDocumentView.as_view(), name='vehicle-documents'),
    path('vehicle/<uuid:vehicle_id>/upload/', VehicleDocumentView.as_view(), name='vehicle-document-upload'),
    path('', include(router.urls)),
]
