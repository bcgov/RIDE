from django.shortcuts import render

from rest_framework import viewsets

from .models import Camera, Region, CameraType, CameraMake, Road, RoadMaintenanceContractor, BusinessArea, ElectricalContractor, ConnectionType, ConnectionProtocol, CommunicationType, PowerSource, CommunicationDevice, Antenna, ServiceProvider, CameraNote, CameraLog
from .serializers import CameraSerializer, RegionSerializer, RoadSerializer, RoadMaintenanceContractorSerializer, BusinessAreaSerializer, ElectricalContractorSerializer, CameraTypeSerializer, CameraMakeSerializer, ConnectionTypeSerializer, ConnectionProtocolSerializer, CommunicationTypeSerializer, PowerSourceSerializer, CommunicationDeviceSerializer, AntennaeSerializer, ServiceProviderSerializer, CameraNoteSerializer, CameraLogSerializer
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

class CameraViewSet(viewsets.ModelViewSet):
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer

class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Region.objects.filter(is_active=True)
    serializer_class = RegionSerializer

    @action(
        detail=False,
        methods=["put"],
        url_path="bulk-update",
    )
    @transaction.atomic
    def bulk_update(self, request):
        items = request.data.get("items", [])

        if not isinstance(items, list):
            return Response(
                {"error": "items must be a list"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        submitted_ids = set()

        for index, item in enumerate(items):
            item_id = item.get("id")
            name = (item.get("name") or "").strip()
            display_order = item.get("display_order", index)

            if not name:
                return Response(
                    {"error": "Name cannot be empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            if item_id:
                try:
                    region = Region.objects.get(
                        id=item_id,
                        is_active=True,
                    )
                except Region.DoesNotExist:
                    return Response(
                        {
                            "error": f"Region {item_id} does not exist."
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                region.name = name
                region.display_order = display_order
                region.save()

            else:
                region = Region.objects.create(
                    name=name,
                    display_order=display_order,
                    is_active=True,
                )

            submitted_ids.add(region.id)

        # Only do this if the frontend submits the complete list.
        Region.objects.filter(
            is_active=True
        ).exclude(
            id__in=submitted_ids
        ).update(
            is_active=False
        )

        queryset = Region.objects.filter(
            is_active=True
        ).order_by("display_order", "id")

        serializer = self.get_serializer(
            queryset,
            many=True,
        )

        return Response(serializer.data)

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
