from rest_framework import serializers
from .models import Document, EXPIRING_DOCUMENT_TYPES

class DocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    target_type = serializers.SerializerMethodField()
    target_name = serializers.SerializerMethodField()

    class Meta:
        model = Document
        fields = [
            'id', 'doc_type', 'doc_type_display', 'status',
            'status_display', 'file', 'expiry_date',
            'content_type', 'object_id', 'target_type', 'target_name',
        ]
        read_only_fields = ['status', 'content_type', 'object_id']

    def validate(self, attrs):
        doc_type = attrs.get('doc_type', getattr(self.instance, 'doc_type', None))
        expiry_date = attrs.get('expiry_date', getattr(self.instance, 'expiry_date', None))

        if doc_type in EXPIRING_DOCUMENT_TYPES and not expiry_date:
            raise serializers.ValidationError({
                'expiry_date': 'An expiry date is required for this document type.',
            })

        return attrs

    def get_target_type(self, obj):
        return obj.content_type.model

    def get_target_name(self, obj):
        target = obj.content_object
        return str(target) if target is not None else 'Unavailable target'
