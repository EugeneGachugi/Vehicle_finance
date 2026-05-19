from django.urls import path
from .views import MyTokenObtainPairView, DriverOnboardingView, UserProfileView, AdminDriverListView, AdminDriverVerificationView

urlpatterns = [
    path('login/', MyTokenObtainPairView.as_view(), name='login'),
    path('onboard/', DriverOnboardingView.as_view(), name = 'onboard'),
    path('profile/', UserProfileView.as_view(), name='profile'),
    path('drivers/', AdminDriverListView.as_view(), name='admin-drivers'),
    path('drivers/<uuid:driver_id>/verification/', AdminDriverVerificationView.as_view(), name='admin-driver-verification'),
]
