from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.users.models import DriverProfile
from apps.vehicles.models import Vehicle
from .models import Document, DocumentStatus
from .serializers import DocumentSerializer


class DocumentViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Document.objects.select_related('content_type').order_by('-id')
        user = self.request.user

        if user.is_staff:
            return queryset

        driver_profile = getattr(user, 'driver_profile', None)
        if driver_profile is None:
            return queryset.none()

        driver_profile_type = ContentType.objects.get_for_model(DriverProfile)
        vehicle_type = ContentType.objects.get_for_model(Vehicle)
        vehicle_ids = Vehicle.objects.filter(driver=driver_profile).values_list('id', flat=True)

        return queryset.filter(
            Q(content_type=driver_profile_type, object_id=str(driver_profile.pk))
            | Q(content_type=vehicle_type, object_id__in=[str(vehicle_id) for vehicle_id in vehicle_ids])
        )

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def review(self, request, pk=None):
        document = self.get_object()
        review_status = request.data.get('status')

        if review_status not in (DocumentStatus.VERIFIED, DocumentStatus.REJECTED):
            return Response(
                {'status': ['Status must be VR or RJ.']},
                status=status.HTTP_400_BAD_REQUEST,
            )

        document.status = review_status
        document.save(update_fields=['status'])
        return Response(self.get_serializer(document).data)


class TargetDocumentView(APIView):
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]
    target_model = None
    target_url_kwarg = None

    def get_target(self, target_id):
        raise NotImplementedError

    def get(self, request, **kwargs):
        target_id = kwargs[self.target_url_kwarg]
        target = self.get_target(target_id)
        content_type = ContentType.objects.get_for_model(self.target_model)
        documents = Document.objects.filter(
            content_type=content_type,
            object_id=str(target.pk),
        ).order_by('-id')
        return Response(DocumentSerializer(documents, many=True, context={'request': request}).data)

    def post(self, request, **kwargs):
        target_id = kwargs[self.target_url_kwarg]
        target = self.get_target(target_id)
        serializer = DocumentSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        document = serializer.save(
            content_type=ContentType.objects.get_for_model(self.target_model),
            object_id=str(target.pk),
            status=DocumentStatus.PENDING,
        )
        return Response(
            DocumentSerializer(document, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class DriverDocumentView(TargetDocumentView):
    target_model = DriverProfile
    target_url_kwarg = 'driver_id'

    def get_target(self, target_id):
        # Admin driver selectors expose User.id, while documents attach to DriverProfile.
        return get_object_or_404(DriverProfile.objects.select_related('user'), user_id=target_id)


class VehicleDocumentView(TargetDocumentView):
    target_model = Vehicle
    target_url_kwarg = 'vehicle_id'

    def get_target(self, target_id):
        return get_object_or_404(Vehicle, id=target_id)
