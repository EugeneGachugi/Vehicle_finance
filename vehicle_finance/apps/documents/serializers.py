from rest_framework import serializers
from django.contrib.contenttypes.models import ContentType
from .models import Document

class DocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source = 'get_doc_type_display', read_only=True)
    status_display = serializers.CharField(source= 'get_status_display', read_only=True)

    class Meta:
        model = Document
        fields = [
            'id', 'doc_type', 'doc_type_display', 'status', 
            'status_display', 'file', 'expiry_date', 
            'content_type', 'object_id'
        ]