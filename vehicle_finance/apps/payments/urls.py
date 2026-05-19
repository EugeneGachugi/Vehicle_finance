from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FinancingContractViewSet, InvoiceViewSet, PaymentViewSet

router = DefaultRouter()
router.register(r'contracts', FinancingContractViewSet, basename='contract')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
]

