from django.contrib import admin
from .models import Document

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['doc_type', 'status', 'content_object', 'expiry_date']
    list_filter = ['doc_type', 'status']