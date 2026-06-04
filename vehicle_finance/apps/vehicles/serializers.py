from rest_framework import serializers
from .models import Vehicle, CarMake, CarModel

class CarMakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CarMake
        fields = ['id', 'make']
        read_only_fields = ['id']

class CarModelSerializer(serializers.ModelSerializer):
    make_details = CarMakeSerializer(source = 'make', read_only=True)

    class Meta:
        model = CarModel
        fields = ['id', 'name', 'make', 'make_details']
        read_only_fields = ['id']

class VehicleSerializer(serializers.ModelSerializer):
    full_name = serializers.ReadOnlyField(source='full_vehicle_name')
    model_details = CarModelSerializer(source = 'model', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'plate_number', 'full_name', 'model', 'model_details',
            'yom', 'chasis_number', 'engine_number', 'color', 'valuation',
            'status', 'status_display', 'driver'
        ]
        read_only_fields = ['id']
