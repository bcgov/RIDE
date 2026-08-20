from django.shortcuts import render

from rest_framework import viewsets

from .models import Camera, Region, CameraType, CameraMake, Road, RoadMaintenanceContractor, BusinessArea, ElectricalContractor, ConnectionType, ConnectionProtocol, CommunicationType, PowerSource, CommunicationDevice, Antenna, ServiceProvider, CameraNote, CameraLog
from .serializers import CameraSerializer, RegionSerializer, RoadSerializer, RoadMaintenanceContractorSerializer, BusinessAreaSerializer, ElectricalContractorSerializer, CameraTypeSerializer, CameraMakeSerializer, ConnectionTypeSerializer, ConnectionProtocolSerializer, CommunicationTypeSerializer, PowerSourceSerializer, CommunicationDeviceSerializer, AntennaeSerializer, ServiceProviderSerializer, CameraNoteSerializer, CameraLogSerializer


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

class ConnectionTypeViewSet(viewsets.ModelViewSet):
    queryset = ConnectionType.objects.filter(is_active=True)
    serializer_class = ConnectionTypeSerializer

class ConnectionProtocolViewSet(viewsets.ModelViewSet):
    queryset = ConnectionProtocol.objects.filter(is_active=True)
    serializer_class = ConnectionProtocolSerializer

class CommunicationTypeViewSet(viewsets.ModelViewSet):
    queryset = CommunicationType.objects.filter(is_active=True)
    serializer_class = CommunicationTypeSerializer

class PowerSourceViewSet(viewsets.ModelViewSet):
    queryset = PowerSource.objects.filter(is_active=True)
    serializer_class = PowerSourceSerializer

class CommunicationDeviceViewSet(viewsets.ModelViewSet):
    queryset = CommunicationDevice.objects.filter(is_active=True)
    serializer_class = CommunicationDeviceSerializer

class AntennaeViewSet(viewsets.ModelViewSet):
    queryset = Antenna.objects.filter(is_active=True)
    serializer_class = AntennaeSerializer

class ServiceProviderViewSet(viewsets.ModelViewSet):
    queryset = ServiceProvider.objects.filter(is_active=True)
    serializer_class = ServiceProviderSerializer

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

class CameraNoteViewSet(viewsets.ModelViewSet):
    serializer_class = CameraNoteSerializer

    def get_queryset(self):
        return CameraNote.objects.filter(camera_id=self.kwargs['camera_id'])

    def perform_create(self, serializer):
        camera = Camera.objects.get(id=self.kwargs['camera_id'])
        serializer.save(camera=camera, author=self.request.user)

class CameraLogViewSet(viewsets.ModelViewSet):
    serializer_class = CameraLogSerializer

    def get_queryset(self):
        return CameraLog.objects.filter(camera_id=self.kwargs['camera_id'])

    def perform_create(self, serializer):
        camera = Camera.objects.get(id=self.kwargs['camera_id'])
        serializer.save(camera=camera)
