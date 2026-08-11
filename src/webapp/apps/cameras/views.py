from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import Camera, Region, CameraType, CameraMake, Road, RoadMaintenanceContractor, BusinessArea, ElectricalContractor, ConnectionType, ConnectionProtocol, CommunicationType, PowerSource, CommunicationDevice, Antenna, ServiceProvider, CameraNote, CameraLog, CameraHistory, ServiceRequestCcs, CameraDefaultMessaging
from .serializers import CameraSerializer, RegionSerializer, RoadSerializer, RoadMaintenanceContractorSerializer, BusinessAreaSerializer, ElectricalContractorSerializer, CameraTypeSerializer, CameraMakeSerializer, ConnectionTypeSerializer, ConnectionProtocolSerializer, CommunicationTypeSerializer, PowerSourceSerializer, CommunicationDeviceSerializer, AntennaeSerializer, ServiceProviderSerializer, CameraNoteSerializer, CameraLogSerializer, CameraHistorySerializer, ServiceRequestCcsSerializer, CameraDefaultMessagingSerializer, CamerasOrderSerializer, CameraOrderReadSerializer
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .helper import create_camera_history
import requests
from django.http import HttpResponse, HttpResponseNotFound
from apps.users.permissions import IsCameraRole, IsCameraAdmin
import csv
from django.http import HttpResponse
from rest_framework.decorators import action
from django.utils import timezone
from django.core.mail import EmailMessage
from django.conf import settings
from .models import CameraReportSettings
from .serializers import CameraReportSettingsSerializer
import logging
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
import traceback

logger = logging.getLogger(__name__)

# 1. Define the full mapping of frontend field IDs -> (Header Title, Value Extractor)
EXPORT_FIELD_MAP = {
        'location_description': ('Description', lambda c: c.description),
        'business_area': ('Business Area', lambda c: c.business_area.name if getattr(c, 'business_area', None) else ''),
        'region': ('Region', lambda c: c.region.name if c.region else ''),
        'road': ('Road', lambda c: c.road.name if c.road else ''),
        'elevation': ('Elevation', lambda c: getattr(c, 'elevation', '')),
        'latitude': ('Latitude', lambda c: c.locations_geo_latitude),
        'longitude': ('Longitude', lambda c: c.locations_geo_longitude),
        'image_watermark': ('Image Watermark', lambda c: getattr(c, 'image_watermark', '')),
        'camera_credit': ('Camera Credit', lambda c: getattr(c, 'camera_credit', '')),
        'camera_url': ('Camera URL', lambda c: getattr(c, 'camera_url', '')),
        'notes': ('Notes', lambda c: getattr(c, 'notes', '')),
        'camera_views': ('Camera Views', lambda c: getattr(c, 'camera_views', '')),
        'view_descriptions': ('View Descriptions', lambda c: getattr(c, 'view_descriptions', '')),
        'camera_type': ('Camera Type', lambda c: c.camera_type.name if c.camera_type else ''),
        'camera_make': ('Camera Make', lambda c: c.camera_make.name if c.camera_make else ''),
        'installed_date': ('Installed Date', lambda c: getattr(c, 'installed_date', '')),
        'last_inspected': ('Last Inspected', lambda c: getattr(c, 'last_inspected', '')),
        'closeby_weather_stations': ('Close-by Weather Stations', lambda c: getattr(c, 'weather_stations', '')),
        'closeby_geotechnical_sensors': ('Close-by Geotechnical Sensors', lambda c: getattr(c, 'geotechnical_sensors', '')),
    }

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
    permission_classes = [IsCameraRole]
    queryset = Camera.objects.all()
    serializer_class = CameraSerializer

    def get_permissions(self):
        if self.action in ('create', 'destroy', 'export', 'service_request', 'clone'):
            return [IsCameraAdmin()]
        return [permission() for permission in self.permission_classes]

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

    @transaction.atomic
    def perform_update(self, serializer):
        camera = self.get_object()

        # Capture Camera values BEFORE saving
        old_values = {
            "title": camera.title,
            "description": camera.description,
        }

        # Capture CameraView values BEFORE saving, keyed by id
        old_views = {
            v.id: {
                "is_on": v.is_on,
                "disabled_reason": v.disabled_reason,
                "disabled_short_description": v.disabled_short_description,
                "disabled_long_description": v.disabled_long_description,
            }
            for v in camera.views.all()
        }

        camera = serializer.save()

        # --- Camera-level diff ---
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

        # --- CameraView-level diff  ---
        for view in camera.views.all():
            old = old_views.get(view.id)
            if old is None:
                continue  # newly created view in this same PATCH — not a toggle event

            view_changes = {}
            for field in (
                "is_on",
                "disabled_reason",
                "disabled_short_description",
                "disabled_long_description",
            ):
                old_val = old[field]
                new_val = getattr(view, field)
                if old_val != new_val:
                    view_changes[field] = {"old": old_val, "new": new_val}

            if view_changes:
                action_type = "disabled" if not view.is_on else "enabled"
                orientation_label = view.orientation.capitalize() if view.orientation else "Unknown"
                create_camera_history(
                    camera=camera,
                    user=self.request.user,
                    action_type=action_type,
                    category="Camera View",
                    description=f"{action_type.capitalize()} {orientation_label} view",
                    changes=view_changes,
                )

    @action(detail=True, methods=["get"], url_path="image-proxy")
    def image_proxy(self, request, pk=None):
        webcam_id = request.query_params.get("webcam_id") or pk
        t = request.query_params.get("t", "")
        url = f"https://www.drivebc.ca/images/{webcam_id}.jpg"

        try:
            resp = requests.get(url, params={"t": t}, timeout=5)
        except requests.RequestException:
            return HttpResponseNotFound()

        if resp.status_code != 200:
            return HttpResponseNotFound()

        return HttpResponse(resp.content, content_type=resp.headers.get("Content-Type", "image/jpeg"))


    @action(detail=False, methods=['get'], url_path='export')
    def export(self, request):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = (
            f'attachment; filename="camera-report-{timezone.now().date()}.csv"'
        )

        # 2. Parse selected fields from request query params
        fields_param = request.query_params.get('fields')
        
        if fields_param:
            requested_keys = [f.strip() for f in fields_param.split(',') if f.strip() in EXPORT_FIELD_MAP]
        else:
            requested_keys = []

        # Fall back to all available fields if no specific fields were requested
        active_keys = requested_keys if requested_keys else list(EXPORT_FIELD_MAP.keys())

        writer = csv.writer(response)

        # 3. Always include 'ID' and 'Title' as default leading columns, then add selected headers
        headers = ['ID', 'Title'] + [EXPORT_FIELD_MAP[key][0] for key in active_keys]
        writer.writerow(headers)

        cameras = Camera.objects.select_related(
            'road', 'region', 'camera_type', 'camera_make',
            'power_source', 'communication_type',
        ).all()

        # 4. Dynamically generate values for each row based on active keys
        for camera in cameras:
            row = [camera.id, camera.title]
            for key in active_keys:
                extractor = EXPORT_FIELD_MAP[key][1]
                row.append(extractor(camera))
            writer.writerow(row)

        return response

    @action(detail=True, methods=['post'], url_path='service-request')
    def service_request(self, request, pk=None):
        camera = self.get_object()

        to_emails = request.data.get('to', [])
        cc_emails = request.data.get('cc', [])
        subject = request.data.get('subject', '').strip()
        body = request.data.get('body', '').strip()

        if not to_emails:
            return Response(
                {'detail': 'At least one recipient is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not subject:
            return Response(
                {'detail': 'Subject is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not body:
            return Response(
                {'detail': 'Message body is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        email = EmailMessage(
            subject=subject,
            body=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=to_emails,
            cc=cc_emails,
        )

        try:
            email.send(fail_silently=False)
        except Exception as e:
            return Response(
                {'detail': 'Failed to send email.'},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        create_camera_history(
            camera=camera,
            user=request.user,
            action_type='service_request',
            category='Camera',
            description=f'Service request sent: {subject}',
            changes={'to': to_emails, 'cc': cc_emails, 'subject': subject},
        )

        return Response({'detail': 'Service request sent.'}, status=status.HTTP_200_OK)

    # ---------------------------------------------------------
    # TIMELAPSE PROXY ACTIONS
    # ---------------------------------------------------------
    @action(detail=True, methods=["get"], url_path="timelapse")
    def timelapse_list(self, request, pk=None):
        camera = self.get_object()

        view_id = request.query_params.get("view")

        matching_view = None

        if view_id:
            matching_view = camera.views.filter(
                id=view_id
            ).first()

        if not matching_view:
            matching_view = camera.views.first()

        if not matching_view or not matching_view.drivebc_webcam_id:
            return Response(
                {
                    "detail": (
                        "No valid DriveBC webcam ID found "
                        "for this view."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        webcam_id = matching_view.drivebc_webcam_id
        api_key = getattr(settings, "DRIVEBC_TIMELAPSE_API_KEY", None)
        drivebc_timelapse_api_root = getattr(settings, "DRIVEBC_TIMELAPSE_API_ROOT", None)

        if not api_key:
            logger.error(
                "DriveBC API credentials are not configured."
            )

            return Response(
                {"detail": "External API credentials are not configured."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        target_url = f"{drivebc_timelapse_api_root}/{webcam_id}/timelapse/"

        headers = {
            "Accept": "application/json",
            "X-API-Key": api_key,
        }

        try:
            resp = requests.get(
                target_url,
                headers=headers,
                timeout=(3, 15),
            )

            if resp.status_code != 200:
                logger.warning(
                    "DriveBC timelapse API returned status %s "
                    "for webcam %s",
                    resp.status_code,
                    webcam_id,
                )

                return Response(
                    {
                        "detail": (
                            "The external timelapse service "
                            "returned an error."
                        ),
                        "upstream_status": resp.status_code,
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            try:
                data = resp.json()
            except requests.exceptions.JSONDecodeError:
                logger.error(
                    "DriveBC returned invalid JSON for webcam %s",
                    webcam_id,
                )

                return Response(
                    {"detail": "Invalid response from external API."},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            return Response(
                data,
                status=status.HTTP_200_OK,
            )

        except requests.exceptions.Timeout:
            logger.warning(
                "DriveBC timelapse request timed out for webcam %s",
                webcam_id,
            )

            return Response(
                {"detail": "External timelapse service timed out."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )

        except requests.exceptions.RequestException:
            logger.exception(
                "DriveBC timelapse request failed for webcam %s",
                webcam_id,
            )

            return Response(
                {"detail": "Failed to reach external timelapse service."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=True, methods=["get"], url_path="timelapse-image")
    def timelapse_image(self, request, pk=None):
        """
        Proxies request to fetch the raw JPEG binary frame for a given timestamp.

        GET /api/cameras/{pk}/timelapse-image/?view=21&timestamp=20260902190507
        """
        camera = self.get_object()

        view_id = request.query_params.get("view")
        timestamp = request.query_params.get("timestamp")

        if not timestamp:
            return Response(
                {"detail": "Timestamp query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        matching_view = None

        if view_id:
            matching_view = camera.views.filter(
                id=view_id
            ).first()

        if not matching_view:
            matching_view = camera.views.first()

        if not matching_view or not matching_view.drivebc_webcam_id:
            return Response(
                {"detail": "No valid DriveBC webcam ID found for this view."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        webcam_id = matching_view.drivebc_webcam_id

        api_key = getattr(settings, "DRIVEBC_TIMELAPSE_API_KEY", None)
        drivebc_timelapse_api_root = getattr(settings, "DRIVEBC_TIMELAPSE_API_ROOT", None)

        if not api_key:
            logger.error(
                "DriveBC API credentials are not configured."
            )

            return Response(
                {"detail": "External API credentials are not configured."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        target_url = f"{drivebc_timelapse_api_root}/{webcam_id}/timelapse/{timestamp}/"

        headers = {
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "X-API-Key": api_key,
        }

        try:
            # Fetch binary response from upstream
            resp = requests.get(
                target_url,
                headers=headers,
                timeout=(3, 15),
            )

            if resp.status_code != 200:
                logger.warning(
                    "DriveBC timelapse image API returned status %s "
                    "for webcam %s, timestamp %s",
                    resp.status_code,
                    webcam_id,
                    timestamp,
                )

                return Response(
                    {
                        "detail": (
                            "The external timelapse image service "
                            "returned an error."
                        ),
                        "upstream_status": resp.status_code,
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            # Return raw image directly to frontend
            return HttpResponse(
                resp.content,
                content_type=resp.headers.get(
                    "Content-Type",
                    "image/jpeg",
                ),
            )

        except requests.exceptions.Timeout:
            logger.warning(
                "DriveBC timelapse image request timed out "
                "for webcam %s, timestamp %s",
                webcam_id,
                timestamp,
            )

            return Response(
                {"detail": "External timelapse image service timed out."},
                status=status.HTTP_504_GATEWAY_TIMEOUT,
            )

        except requests.exceptions.RequestException:
            logger.exception(
                "DriveBC timelapse image request failed "
                "for webcam %s, timestamp %s",
                webcam_id,
                timestamp,
            )

            return Response(
                {"detail": "Failed to fetch image frame."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

    @action(detail=True, methods=['post'])
    @transaction.atomic
    def clone(self, request, pk=None):
        original = self.get_object()
        original_views = list(original.views.all())

        original.pk = None
        original.id = None
        original.title = f"{original.title} (Copy)"
        original.save()

        for view in original_views:
            view.pk = None
            view.id = None
            view.camera = original
            view.save()

        create_camera_history(
            camera=original,
            user=request.user,
            action_type="create",
            category="Camera",
            description="Cloned camera location",
        )

        serializer = self.get_serializer(original)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return CameraNote.objects.filter(camera_id=self.kwargs['camera_id'])

    def perform_create(self, serializer):
        camera = Camera.objects.get(id=self.kwargs['camera_id'])
        serializer.save(camera=camera, author=self.request.user)

    def perform_update(self, serializer):
        note = self.get_object()
        if note.author_id != self.request.user.id:
            raise PermissionDenied("You can only edit your own notes.")
        serializer.save()

class CameraLogViewSet(viewsets.ModelViewSet):
    serializer_class = CameraLogSerializer

    def get_queryset(self):
        return CameraLog.objects.filter(camera_id=self.kwargs['camera_id'])

    def perform_create(self, serializer):
        camera = Camera.objects.get(id=self.kwargs['camera_id'])
        serializer.save(camera=camera)

class CameraReportSettingsViewSet(viewsets.GenericViewSet):
    serializer_class = CameraReportSettingsSerializer

    @action(
        detail=False,
        methods=["get", "put", "patch"],
        url_path="fields",
    )
    def fields(self, request):
        instance, _ = CameraReportSettings.objects.get_or_create(
            pk=1,
            defaults={"selected_fields": []},
        )

        if request.method == "GET":
            serializer = self.get_serializer(instance)
            return Response(serializer.data)

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=request.method == "PATCH",
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

class ServiceRequestCcsViewSet(viewsets.GenericViewSet):
    serializer_class = ServiceRequestCcsSerializer

    def list(self, request, *args, **kwargs):
        instance, _ = ServiceRequestCcs.objects.get_or_create(
            pk=1,
            defaults={"service_request_ccs": []},
        )

        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        instance, _ = ServiceRequestCcs.objects.get_or_create(
            pk=1,
            defaults={"service_request_ccs": []},
        )

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=False,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        instance, _ = ServiceRequestCcs.objects.get_or_create(
            pk=1,
            defaults={"service_request_ccs": []},
        )

        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

class CameraDefaultMessagingViewSet(viewsets.GenericViewSet):

    serializer_class = CameraDefaultMessagingSerializer

    
    def list(self, request):
        """GET /api/camera-default-messaging/"""
        instance = CameraDefaultMessaging.load()
        serializer = CameraDefaultMessagingSerializer(instance)
        return Response(serializer.data)

    def get_object(self):
        return CameraDefaultMessaging.load()

    def retrieve(self, request, *args, **kwargs):
        """GET /api/camera-default-messaging/1/"""
        serializer = self.get_serializer(self.get_object())
        return Response(serializer.data)

    def update(self, request, *args, **kwargs):
        """PUT /api/camera-default-messaging/1/"""
        instance = self.get_object()

        partial = kwargs.pop('partial', False)
        serializer = self.get_serializer(
            instance,
            data=request.data,
            partial=partial,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def partial_update(self, request, *args, **kwargs):
        """PATCH /api/camera-default-messaging/1/"""
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

class CamerasOrderViewSet(viewsets.ViewSet):
    def list(self, request, *args, **kwargs):
        cameras = Camera.objects.all().order_by('display_order')
        return Response({
            'cameras': CameraOrderReadSerializer(cameras, many=True).data
        })
    
    def update(self, request, *args, **kwargs):
        serializer = CamerasOrderSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            updated_cameras = serializer.save()
        
        return Response({
            'cameras': CameraOrderReadSerializer(updated_cameras, many=True).data
        })

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

def camera_image_proxy(request, webcam_id):
    url = f"https://www.drivebc.ca/images/{webcam_id}.jpg"
    params = {"t": request.GET.get("t", "")}
    resp = requests.get(url, params=params, timeout=5)
    if resp.status_code != 200:
        return HttpResponseNotFound()
    return HttpResponse(resp.content, content_type=resp.headers.get("Content-Type", "image/jpeg"))