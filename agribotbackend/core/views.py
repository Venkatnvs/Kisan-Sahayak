from rest_framework import generics, permissions, filters, serializers, status
from .models import Field, FieldData
from .serializers import (
    FieldSerializer,
    FieldDataSerializer
)
from rest_framework.response import Response
from django.db.models import Q
import google.generativeai as gai
from PIL import Image
from io import BytesIO
import json
import requests
import base64
from django.core.files.base import ContentFile
from django.core.cache import cache

gai.configure(api_key='AIzaSyBhVjgM6I3Zz-90uvu7y_dPLZ83yxLCVzA')
model = gai.GenerativeModel("gemini-1.5-flash-latest")
chat = model.start_chat(history=[])


class FieldListCreate(generics.ListCreateAPIView):
    serializer_class = FieldSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Field.objects.none()
        return Field.objects.filter()
    
    def perform_create(self, serializer):
        serializer.save()

class FieldRetrieve(generics.RetrieveAPIView):
    serializer_class = FieldSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Field.objects.none()
        return Field.objects.all()

    def call_weather_api(self, lat, lon, endpoint):
        url = f'https://api.agromonitoring.com/agro/1.0/{endpoint}'
        params = {
            'lat': lat,
            'lon': lon,
            'units': 'metric',
            'appid': "d5cbfc27141a4f02b2b51432658158c3"
        }
        response = requests.get(url, params=params)
        if response.status_code == 200:
            return response.json()
        else:
            return {
                "error": "Unable to fetch data",
                "status_code": response.status_code
            }

    def get_weather_for_lat_lng(self, lat, lon):
        cache_key = f"weather_{lat}_{lon}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data
        weather_data = self.call_weather_api(lat, lon, 'weather')
        cache.set(cache_key, weather_data, timeout=900)
        return weather_data

    def get_forecast_for_lat_lng(self, lat, lon):
        cache_key = f"forecast_{lat}_{lon}"
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data
        forecast_data = self.call_weather_api(lat, lon, 'weather/forecast')
        cache.set(cache_key, forecast_data, timeout=900)
        return forecast_data

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        data = serializer.data

        field_with_disease = FieldData.objects.filter(main_field=instance, is_disease=True)
        unique_disease_records = {}
        for record in field_with_disease:
            location = record.location or {}
            key = (location.get('lat'), location.get('lng'))
            if key not in unique_disease_records:
                unique_disease_records[key] = record

        data['disease_locations'] = []
        for record in unique_disease_records.values():
            record_data = {
                'location': record.location,
                'temperature': record.temperature,
                'humidity': record.humidity,
                'soil_moisture': record.soil_moisture,
                'img': request.build_absolute_uri(record.img.url) if record.img else None,
                'description': record.description,
                'crop_name': record.crop_name,
                'solution': record.solution,
                'created_at': record.created_at.isoformat() if record.created_at else None
            }
            data['disease_locations'].append(record_data)

        if data.get('main_coordinate'):
            main_coordinate = list(data['main_coordinate'])
            lat = main_coordinate[1]
            lon = main_coordinate[0]
            if lat is not None and lon is not None:
                weather_data = self.get_weather_for_lat_lng(lat, lon)
                forecast_data = self.get_forecast_for_lat_lng(lat, lon)
                data['weather'] = weather_data
                data['forecast'] = forecast_data

        return Response(data, status=status.HTTP_200_OK)

class FieldDataListCreate(generics.ListCreateAPIView):
    serializer_class = FieldDataSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return FieldData.objects.none()
        return FieldData.objects.all()

    def gemini_img_bot(self, image):
        try:
            # Reset cursor position and read image data
            image.seek(0)
            img_bytes = BytesIO(image.read())
            img = Image.open(img_bytes)

            prompt = (
                "Analyze the given image and return a valid JSON object only. "
                "Ensure that there are no markdown, code blocks, or extra characters. "
                "The JSON should strictly follow this structure:\n"
                "And return only a valid JSON object without code blocks or markdown formatting"
                "{"
                '  "crop_name": "Identified crop name",'
                '  "description": "Detailed analysis of the crop condition, including health status",'
                '  "is_disease": true/false,'
                '  "solution": "Recommended solution if a disease is detected, otherwise an empty string"'
                '  "is_not_crop": true/false'
                "}"
            )

            response = chat.send_message([prompt, img])
            response_text = response.text.strip().replace("```json", "").replace("```", "")
            print(response_text)
            response_json = json.loads(response_text)
            return response_json

        except Exception as e:
            return {
                "error": f"Error generating description: {str(e)}",
                "crop_name": "Unknown",
                "description": "",
                "is_disease": False,
                "solution": "",
                "is_not_crop": False
            }

    def perform_create(self, serializer):
        # At this point, the 'img' field is already a file-like object thanks to Base64ImageField
        if "img" in serializer.validated_data:
            img_file = serializer.validated_data["img"]
            gemini_response = self.gemini_img_bot(img_file)

            # Extract values from the Gemini response
            crop_name = gemini_response.get("crop_name", "Unknown")
            disease_description = gemini_response.get("description", "")
            is_disease = gemini_response.get("is_disease", False)
            solution = gemini_response.get("solution", "No solution required")
            is_not_crop = gemini_response.get("is_not_crop", False)

            # Update serializer data accordingly
            serializer.validated_data["description"] = disease_description
            serializer.validated_data["is_disease"] = is_disease
            serializer.validated_data["is_not_crop"] = is_not_crop
            serializer.validated_data["crop_name"] = crop_name
            serializer.validated_data["solution"] = solution

        serializer.save()