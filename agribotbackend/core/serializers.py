from rest_framework import serializers
from .models import Field, FieldData

class FieldSerializer(serializers.ModelSerializer):
    main_coordinate = serializers.SerializerMethodField()
    map_tile_url = serializers.SerializerMethodField()

    class Meta:
        model = Field
        fields = ['id', 'name', 'description', 'geometry', 'size', 'created_at', 'updated_at', 'main_coordinate', 'map_tile_url']
        read_only_fields = ['id', 'created_at', 'updated_at', 'main_coordinate', 'map_tile_url']

    def get_main_coordinate(self, obj):
        return obj.main_coordinate
    
    def get_map_tile_url(self, obj):
        return obj.google_maps_url

    def validate(self, data):
        if 'name' in data:
            if Field.objects.filter(name=data['name']).exists():
                raise serializers.ValidationError("Field with this name already exists")
        return data
    
class FieldDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = FieldData
        fields = "__all__"