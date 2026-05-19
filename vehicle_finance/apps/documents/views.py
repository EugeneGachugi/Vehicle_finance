from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from .models import Document
from .serializers import DocumentSerializer
from django.contrib.contenttypes.models import ContentType

class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class=DocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Document.objects.all()
        # Get content type for DriverProfile
        driver_profile_ct = ContentType.objects.get_for_model(user.driver_profile)
        return Document.objects.filter(content_type=driver_profile_ct, object_id=user.driver_profile.id)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def review(self, request, pk=None):
            document = self.get_object()
            review_status = request.data.get('status')

            if review_status not in ['VR', 'RJ']:
                  return Response({"error" : "Invalid status"}, status=status.HTTP_400_BAD_REQUEST)
            
            document.status = review_status
            document.save()
            return Response({"message" : f"Document marked as {document.get_status_display()}"})
