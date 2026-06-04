from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FinancingContractViewSet,
    InvoiceViewSet,
    MpesaCallbackView,
    MpesaPaymentStatusView,
    MpesaSTKRequestViewSet,
    MpesaSTKPushView,
    PaymentViewSet,
)

router = DefaultRouter()
router.register(r'contracts', FinancingContractViewSet, basename='contract')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'mpesa/requests', MpesaSTKRequestViewSet, basename='mpesa-request')

urlpatterns = [
    path('mpesa/stk-push/', MpesaSTKPushView.as_view(), name='mpesa-stk-push'),
    path('mpesa/status/', MpesaPaymentStatusView.as_view(), name='mpesa-payment-status'),
    path('mpesa/callback/', MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('', include(router.urls)),
]
