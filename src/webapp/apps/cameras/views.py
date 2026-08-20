from django.shortcuts import render
from rest_framework import viewsets
from .models import Camera, Region, CameraType, CameraMake, Road, RoadMaintenanceContractor, BusinessArea, ElectricalContractor, ConnectionType, ConnectionProtocol, CommunicationType, PowerSource, CommunicationDevice, Antenna, ServiceProvider, CameraNote, CameraLog, CameraHistory
from .serializers import CameraSerializer, RegionSerializer, RoadSerializer, RoadMaintenanceContractorSerializer, BusinessAreaSerializer, ElectricalContractorSerializer, CameraTypeSerializer, CameraMakeSerializer, ConnectionTypeSerializer, ConnectionProtocolSerializer, CommunicationTypeSerializer, PowerSourceSerializer, CommunicationDeviceSerializer, AntennaeSerializer, ServiceProviderSerializer, CameraNoteSerializer, CameraLogSerializer, CameraHistorySerializer
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .helper import create_camera_history

class BulkUpdateViewSet(viewsets.ReadOnlyModelViewSet):

    model = None

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

            if not name:
                return Response(
                    {"error": "Name cannot be empty."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            display_order = item.get(
                "display_order",
                index,
            )

            if item_id:
                try:
                    obj = self.model.objects.get(
                        id=item_id,
                        is_active=True,
                    )
                except self.model.DoesNotExist:
                    return Response(
                        {
                            "error": (
                                f"{self.model.__name__} "
                                f"{item_id} does not exist."
                            )
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                obj.name = name
                obj.display_order = display_order
                obj.save()

            else:
                existing = self.model.objects.filter(
                    name=name
                ).first()

                if existing:
                    existing.display_order = display_order
                    existing.is_active = True
                    existing.save()

                    obj = existing

                else:
                    obj = self.model.objects.create(
                        name=name,
                        display_order=display_order,
                        is_active=True,
                    )

            submitted_ids.add(obj.id)

        self.model.objects.filter(
            is_active=True
        ).exclude(
            id__in=submitted_ids
        ).update(
            is_active=False
        )

        queryset = self.model.objects.filter(
            is_active=True
        ).order_by(
            "display_order",
            "id",
        )

        serializer = self.get_serializer(
            queryset,
            many=True,
        )

        return Response(serializer.data)

class CameraViewSet(viewsets.ModelViewSet):
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer

    @transaction.atomic
    def perform_create(self, serializer):
        camera = serializer.save()

        create_camera_history(
            camera=camera,
            user=self.request.user,
            action_type="create",
            category="Camera",
            description="Created camera",
        )

        camera = self.get_object()

        # Capture values BEFORE saving
        old_values = {
            "title": camera.title,
            "description": camera.description,
        }

        camera = serializer.save()

        changes = {}

        if old_values["title"] != camera.title:
            changes["title"] = {
                "old": old_values["title"],
                "new": camera.title,
            }

        if old_values["description"] != camera.description:
            changes["description"] = {
                "old": old_values["description"],
                "new": camera.description,
            }

        if changes:
            create_camera_history(
                camera=camera,
                user=self.request.user,
                action_type="update",
                category="Camera",
                description="Updated camera information",
                changes=changes,
            )


    @transaction.atomic
    def perform_update(self, serializer):
        try:
            camera = self.get_object()

            old_values = {
                "title": camera.title,
                "description": camera.description,
                
            }

            camera = serializer.save()

            changes = {}

            if old_values["title"] != camera.title:
                changes["title"] = {
                    "old": old_values["title"],
                    "new": camera.title,
                }

            if old_values["description"] != camera.description:
                changes["description"] = {
                    "old": old_values["description"],
                    "new": camera.description,
                }


            if changes:

                create_camera_history(
                    camera=camera,
                    user=self.request.user,
                    action_type="update",
                    category="Camera",
                    description="Updated camera information",
                    changes=changes,
                )

        except Exception as e:
            raise
class CameraHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CameraHistorySerializer

    def get_queryset(self):
        return CameraHistory.objects.filter(
            camera_id=self.kwargs["camera_id"]
        ).select_related(
            "user"
        )

class RegionViewSet(BulkUpdateViewSet):
    model = Region
    queryset = Region.objects.filter(is_active=True)
    serializer_class = RegionSerializer

class CameraTypeViewSet(BulkUpdateViewSet):
    model = CameraType
    queryset = CameraType.objects.filter(is_active=True)
    serializer_class = CameraTypeSerializer


class CameraMakeViewSet(BulkUpdateViewSet):
    model = CameraMake
    queryset = CameraMake.objects.filter(is_active=True)
    serializer_class = CameraMakeSerializer

class ConnectionTypeViewSet(BulkUpdateViewSet):
    model = ConnectionType
    queryset = ConnectionType.objects.filter(is_active=True)
    serializer_class = ConnectionTypeSerializer

class ConnectionProtocolViewSet(BulkUpdateViewSet):
    model = ConnectionProtocol
    queryset = ConnectionProtocol.objects.filter(is_active=True)
    serializer_class = ConnectionProtocolSerializer

class CommunicationTypeViewSet(BulkUpdateViewSet):
    model = CommunicationType
    queryset = CommunicationType.objects.filter(is_active=True)
    serializer_class = CommunicationTypeSerializer

class PowerSourceViewSet(BulkUpdateViewSet):
    model = PowerSource
    queryset = PowerSource.objects.filter(is_active=True)
    serializer_class = PowerSourceSerializer

class CommunicationDeviceViewSet(BulkUpdateViewSet):
    model = CommunicationDevice
    queryset = CommunicationDevice.objects.filter(is_active=True)
    serializer_class = CommunicationDeviceSerializer

class AntennaeViewSet(BulkUpdateViewSet):
    model = Antenna
    queryset = Antenna.objects.filter(is_active=True)
    serializer_class = AntennaeSerializer

class ServiceProviderViewSet(BulkUpdateViewSet):
    model = ServiceProvider
    queryset = ServiceProvider.objects.filter(is_active=True)
    serializer_class = ServiceProviderSerializer

class RoadViewSet(BulkUpdateViewSet):
    model = Road
    queryset = Road.objects.filter(is_active=True)
    serializer_class = RoadSerializer

class RoadMaintenanceContractorViewSet(BulkUpdateViewSet):
    model = RoadMaintenanceContractor
    queryset = RoadMaintenanceContractor.objects.all()
    serializer_class = RoadMaintenanceContractorSerializer

class BusinessAreaViewSet(BulkUpdateViewSet):
    model = BusinessArea
    queryset = BusinessArea.objects.filter(is_active=True)
    serializer_class = BusinessAreaSerializer

class ElectricalContractorViewSet(BulkUpdateViewSet):
    model = ElectricalContractor
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
