from django.contrib import admin
from .models import DriverProfile
from django.contrib.auth.admin import UserAdmin

class CustomUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        ('Roles & Identity', {'fields': ('role', 'national_id')}),
    )
    list_display = ['username', 'email', 'role', 'national_id']
@admin.register(DriverProfile)
class DriverProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'kra_pin', 'dl_number', 'verification_status']
    list_filter = ['verification_status']
    search_fields = ['user__username', 'kra_pin', 'dl_number']

# Register your models here.
