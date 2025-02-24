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

class FieldRetrieveUpdateDestroy(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = FieldSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return Field.objects.none()
        return Field.objects.filter()
    
class FieldDataListCreate(generics.ListCreateAPIView):
    serializer_class = FieldDataSerializer

    def get_queryset(self):
        if getattr(self, 'swagger_fake_view', False):
            return FieldData.objects.none()
        return FieldData.objects.all()

    def gemini_img_bot(self, image):
        try:
            # Reset cursor position and read image
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
                "}"
            )

            response = chat.send_message([prompt, img])
            response_text = response.text.strip()
            print(response_text)
            response_json = json.loads(response_text)
            return response_json

        except Exception as e:
            return {
                "error": f"Error generating description: {str(e)}",
                "crop_name": "Unknown",
                "description": "",
                "is_disease": False,
                "solution": ""
            }

    def perform_create(self, serializer):
        if 'img' in serializer.validated_data:
            img = serializer.validated_data['img']
            gemini_response = self.gemini_img_bot(img)

            # Extract values from the response
            crop_name = gemini_response.get("crop_name", "Unknown")
            disease_description = gemini_response.get("description", "")
            is_disease = gemini_response.get("is_disease", False)
            solution = gemini_response.get("solution", "No solution required")

            # Update serializer data
            serializer.validated_data['description'] = disease_description
            serializer.validated_data['is_disease'] = is_disease
            serializer.validated_data['crop_name'] = crop_name
            serializer.validated_data['solution'] = solution

        serializer.save()