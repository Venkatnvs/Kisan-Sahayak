from rest_framework import serializers
from .models import Field, FieldData
import base64
import uuid
from django.core.files.base import ContentFile
from cloudinary.utils import cloudinary_url

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
    
class Base64ImageField(serializers.ImageField):
    def to_internal_value(self, data):
        # If this is already a file or None, just pass it through
        if data is None or hasattr(data, 'read'):
            return data
            
        # If the incoming data is a base64 string, decode it
        if isinstance(data, str):
            # Remove header if it exists
            if "data:" in data and ";base64," in data:
                header, data = data.split(";base64,")
            try:
                decoded_file = base64.b64decode(data)
            except Exception:
                raise serializers.ValidationError("Invalid image data")
            file_name = str(uuid.uuid4())[:12]  # Generate a random file name
            file_extension = "jpg"  # Assume jpg; you can add logic to detect type if needed
            complete_file_name = f"{file_name}.{file_extension}"
            data = ContentFile(decoded_file, name=complete_file_name)
            
        return data
    
class FieldDataSerializer(serializers.ModelSerializer):
    img = Base64ImageField(required=False, allow_null=True)
    img_url = serializers.SerializerMethodField()

    class Meta:
        model = FieldData
        fields = "__all__"
        read_only_fields = ['img_url']

    def get_img_url(self, obj):
        if not obj.img:
            return None
        
        # If img is a string (Cloudinary public_id)
        if isinstance(obj.img, str):
            url, options = cloudinary_url(obj.img)
            return url
        
        # If img is a CloudinaryField
        if hasattr(obj.img, 'url'):
            return obj.img.url
            
        return None
