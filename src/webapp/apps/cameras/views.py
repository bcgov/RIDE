from django.shortcuts import render

from rest_framework import viewsets

from .models import Camera, Region, Road, RoadMaintenanceContractor
from .serializers import CameraSerializer, RegionSerializer, RoadSerializer, RoadMaintenanceContractorSerializer


class CameraViewSet(viewsets.ModelViewSet):
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer

class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Region.objects.filter(is_active=True)
    serializer_class = RegionSerializer

class RoadViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Road.objects.filter(is_active=True)
    serializer_class = RoadSerializer

class RoadMaintenanceContractorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RoadMaintenanceContractor.objects.all()
    serializer_class = RoadMaintenanceContractorSerializer

# class BusinessAreaViewSet(viewsets.ReadOnlyModelViewSet):
#     queryset = BusinessArea.objects.filter(is_active=True)
#     serializer_class = businessAreaSerializer
