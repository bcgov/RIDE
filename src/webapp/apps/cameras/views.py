from django.shortcuts import render

from rest_framework import viewsets

from .models import Camera
from .serializers import CameraSerializer


class CameraViewSet(viewsets.ModelViewSet):
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer
