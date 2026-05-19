from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.permissions import IsAdminUser
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import MyTokenObtainPairSerializer, DriverOnboardingSerializer, UserProfileSerializer, AdminDriverSerializer
from .models import User
##Used to generate list of all drivers through the endpoint defined in urls.py
class AdminDriverListView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        drivers = User.objects.filter(role=User.Role.DRIVER).select_related('driver_profile')
        serializer = AdminDriverSerializer(drivers, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class AdminDriverVerificationView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, driver_id):
        try:
            driver = User.objects.select_related('driver_profile').get(
                id=driver_id,
                role=User.Role.DRIVER
            )
        except User.DoesNotExist:
            return Response(
                {"detail": "Driver could not be found."},
                status=status.HTTP_404_NOT_FOUND
            )

        verification_status = request.data.get("verification_status")
        valid_statuses = [choice[0] for choice in driver.driver_profile.Status.choices]

        if verification_status not in valid_statuses:
            return Response(
                {"verification_status": ["Invalid verification status."]},
                status=status.HTTP_400_BAD_REQUEST
            )

        driver.driver_profile.verification_status = verification_status
        driver.driver_profile.save(update_fields=["verification_status"])

        serializer = AdminDriverSerializer(driver)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    #used to handle the access tokens
class MyTokenObtainPairView(TokenObtainPairView):
    serializer_class = MyTokenObtainPairSerializer

class  DriverOnboardingView(generics.CreateAPIView):
    serializer_class = DriverOnboardingSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        #send_welcome_email(serializer.instance.email)

        return Response(
            {"message": "Driver onboarded successfully"},
            status=status.HTTP_201_CREATED
        )

class UserProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
