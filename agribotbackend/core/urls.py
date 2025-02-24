from django.urls import path
from .views import (
    FieldListCreate,
    FieldRetrieveUpdateDestroy,
    FieldDataListCreate
)

urlpatterns = [
    path('fields/', FieldListCreate.as_view(), name='field-list-create'),
    path('fields/<int:pk>/', FieldRetrieveUpdateDestroy.as_view(), name='field-retrieve-update-destroy'),

    path('field-data/', FieldDataListCreate.as_view(), name='field-data-list-create'),
]