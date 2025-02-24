from django.urls import path
from .views import (
    FieldListCreate,
    FieldRetrieve,
    FieldDataListCreate
)

urlpatterns = [
    path('fields/', FieldListCreate.as_view(), name='field-list-create'),
    path('fields/<int:pk>/', FieldRetrieve.as_view(), name='field-retrieve'),

    path('field-data/', FieldDataListCreate.as_view(), name='field-data-list-create'),
]