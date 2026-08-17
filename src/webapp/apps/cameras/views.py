from django.shortcuts import render

from rest_framework import viewsets

from .models import Camera, Region, CameraType, CameraMake, Road, RoadMaintenanceContractor, BusinessArea, ElectricalContractor
from .serializers import CameraSerializer, RegionSerializer, RoadSerializer, RoadMaintenanceContractorSerializer, BusinessAreaSerializer, ElectricalContractorSerializer, CameraTypeSerializer, CameraMakeSerializer


class CameraViewSet(viewsets.ModelViewSet):
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer

class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Region.objects.filter(is_active=True)
    serializer_class = RegionSerializer

class CameraTypeViewSet(viewsets.ModelViewSet):
    queryset = CameraType.objects.filter(is_active=True)
    serializer_class = CameraTypeSerializer


class CameraMakeViewSet(viewsets.ModelViewSet):
    queryset = CameraMake.objects.filter(is_active=True)
    serializer_class = CameraMakeSerializer

class RoadViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Road.objects.filter(is_active=True)
    serializer_class = RoadSerializer

class RoadMaintenanceContractorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = RoadMaintenanceContractor.objects.all()
    serializer_class = RoadMaintenanceContractorSerializer

class BusinessAreaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = BusinessArea.objects.filter(is_active=True)
    serializer_class = BusinessAreaSerializer

class ElectricalContractorViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = ElectricalContractor.objects.filter(is_active=True)
    serializer_class = ElectricalContractorSerializer
