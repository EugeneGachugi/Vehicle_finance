from django.contrib import admin
from .models import Vehicle, CarMake, CarModel

@admin.register(CarMake)
class CarMakeAdmin(admin.ModelAdmin):
    list_display = ['make']

@admin.register(CarModel)
class CarModelAdmin(admin.ModelAdmin):
    list_display = ['name', 'make']
    list_filter = ['make']

@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display = ['plate_number', 'model', 'yom', 'status', 'driver']
    list_filter = ['status', 'model__make']
    search_fields = ['plate_number', 'chasis_number']