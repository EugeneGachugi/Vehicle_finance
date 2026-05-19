from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth import get_user_model
from .models import DriverProfile
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class DriverProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverProfile
        fields = ['id', 'kra_pin', 'dl_number', 'verification_status']
        read_only_fields = ['id', 'verification_status'] #prevent own verification by drivers

class UserProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    join_date = serializers.DateTimeField(source='date_joined', format='%Y-%m-%d')
    profile_picture = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'join_date', 'profile_picture']

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username

    def get_profile_picture(self, obj):
        # Assuming profile picture is stored somewhere, for now return None
        return None

class DriverOnboardingSerializer(serializers.ModelSerializer):
    profile_details = DriverProfileSerializer()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password', 'national_id', 'profile_details']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'required': True}
        }
    
    def create(self, validated_data):
        profile_data = validated_data.pop('profile_details')

        user = User.objects.create_user(**validated_data)
        DriverProfile.objects.create(user=user, **profile_data)

        return user
    

class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    username_field = 'email'

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        try:
            lookup = {'email__iexact': email}
            user = User.objects.get(**lookup)
        except User.DoesNotExist:
            raise AuthenticationFailed('No active account found with the given credentials')
        except User.MultipleObjectsReturned:
            raise AuthenticationFailed('Multiple accounts use this email address')

        user = authenticate(
            request=self.context.get('request'),
            username=user.get_username(),
            password=password,
        )

        if user is None or not user.is_active:
            raise AuthenticationFailed('No active account found with the given credentials')

        refresh = self.get_token(user)
        data = {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
        self.user = user

        if user.is_staff:
            role = 'FINANCIER'
        elif hasattr(user, 'driver_profile'):
            role = 'DRIVER'
        else:
            role = 'USER'

        data['user'] = {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'role': role,
        }
        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        token['username'] = user.username
        token['email'] = user.email

        if user.is_staff:
            token['role'] = 'FINANCIER'
        elif hasattr(user, 'driver_profile'):
            token['role'] = 'DRIVER'
        else:
            token['role'] = 'USER'
        return token
class AdminDriverSerializer(serializers.ModelSerializer):
    driver_profile = DriverProfileSerializer(read_only=True)
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 
            'username', 
            'full_name', 
            'email', 
            'national_id', 
            'driver_profile'
        ]

    def get_full_name(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username
