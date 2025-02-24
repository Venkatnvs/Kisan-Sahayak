from rest_framework import generics, permissions, filters, serializers, status
from .models import Field
from .serializers import (
    FieldSerializer,
    FieldDataSerializer
)
from rest_framework.response import Response
from django.db.models import Q
import google.generativeai as gai

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
            return Field.objects.none()
        return Field.objects.filter()
    
    def perform_create(self, serializer):
        # pop description from serializer data
        description = serializer.validated_data.pop('description', None)
        # analyze the img using gemini and get the resultm and save it to the serializer description


        serializer.save()