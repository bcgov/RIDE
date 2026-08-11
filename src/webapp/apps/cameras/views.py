from django.shortcuts import render
from rest_framework import viewsets, permissions
from .models import Camera, Region, CameraType, CameraMake, Road, RoadMaintenanceContractor, BusinessArea, ElectricalContractor, ConnectionType, ConnectionProtocol, CommunicationType, PowerSource, CommunicationDevice, Antenna, ServiceProvider, CameraNote, CameraLog, CameraHistory, ServiceRequestCcs
from .serializers import CameraSerializer, RegionSerializer, RoadSerializer, RoadMaintenanceContractorSerializer, BusinessAreaSerializer, ElectricalContractorSerializer, CameraTypeSerializer, CameraMakeSerializer, ConnectionTypeSerializer, ConnectionProtocolSerializer, CommunicationTypeSerializer, PowerSourceSerializer, CommunicationDeviceSerializer, AntennaeSerializer, ServiceProviderSerializer, CameraNoteSerializer, CameraLogSerializer, CameraHistorySerializer, ServiceRequestCcsSerializer
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
        if self.action in ('create', 'destroy', 'export', 'service_request'):
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
                create_camera_history(
                    camera=camera,
                    user=self.request.user,
                    action_type=action_type,
                    category="Camera View",
                    description=f"{action_type.capitalize()} {view.get_orientation_display()} view",
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

    # @action(detail=False, methods=['get'], url_path='export')
    # def export(self, request):
    #     response = HttpResponse(content_type='text/csv')
    #     response['Content-Disposition'] = (
    #         f'attachment; filename="camera-report-{timezone.now().date()}.csv"'
    #     )

    #     writer = csv.writer(response)
    #     writer.writerow([
    #         'ID',
    #         'Title',
    #         'Description',
    #         'Road',
    #         'Region',
    #         'Camera Type',
    #         'Camera Make',
    #         'Visible on DriveBC',
    #         'Marked Delayed',
    #         'Power Source',
    #         'Communication Type',
    #         'Latitude',
    #         'Longitude',
    #         'Created',
    #         'Last Updated',
    #     ])

    #     cameras = Camera.objects.select_related(
    #         'road', 'region', 'camera_type', 'camera_make',
    #         'power_source', 'communication_type',
    #     ).all()

    #     for camera in cameras:
    #         writer.writerow([
    #             camera.id,
    #             camera.title,
    #             camera.description,
    #             camera.road.name if camera.road else '',
    #             camera.region.name if camera.region else '',
    #             camera.camera_type.name if camera.camera_type else '',
    #             camera.camera_make.name if camera.camera_make else '',
    #             camera.visible,
    #             camera.marked_delayed,
    #             camera.power_source.name if camera.power_source else '',
    #             camera.communication_type.name if camera.communication_type else '',
    #             camera.locations_geo_latitude,
    #             camera.locations_geo_longitude,
    #             camera.created,
    #             camera.last_updated,
    #         ])

    #     return response


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
            print(f'Failed to send service request email for camera {camera.id}: {e}')
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

    @action(detail=True, methods=['get'], url_path='timelapse')
    def timelapse_list(self, request, pk=None):
        camera = self.get_object()

        view_id = request.query_params.get('view')
        
        matching_view = None
        if view_id:
            matching_view = camera.views.filter(id=view_id).first()
            
        if not matching_view:
            matching_view = camera.views.first()

        if not matching_view or not matching_view.drivebc_webcam_id:
            return Response(
                {"detail": "No valid DriveBC webcam ID found for this view."},
                status=status.HTTP_400_BAD_REQUEST
            )

        webcam_id = matching_view.drivebc_webcam_id
        target_url = f"https://dev.drivebc.ca/api/webcams/{webcam_id}/admin-timelapse/"

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
        }

        # Set the static dev cookie from settings
        # dev_cookie = getattr(settings, 'DRIVEBC_DEV_COOKIE', None)
        dev_cookie = '_sp_id.c9fa=e979428a-9465-4c79-bb25-af71ed58f91e.1755809246.173.1787850737.1787841103.6807b620-30bf-4f52-8a5b-2744568e749b; csrftoken=QhwdCfSbhoP0xOoyAp5EQS96Mu9bYMS1; sessionid=9hn0ln4d18cx80lrw7ng21try7g4jd16'
        if dev_cookie:
            headers['Cookie'] = dev_cookie

        try:
            resp = requests.get(target_url, headers=headers, timeout=10)
            
            if resp.status_code != 200:
                return Response(
                    {
                        "detail": f"Upstream API returned status {resp.status_code} for webcam_id {webcam_id}",
                        "upstream_status": resp.status_code,
                        "upstream_body": resp.text
                    },
                    status=status.HTTP_502_BAD_GATEWAY
                )

            return Response(resp.json(), status=status.HTTP_200_OK)

        except requests.RequestException as e:
            return Response(
                {"detail": f"Failed to reach external timelapse service: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

    @action(detail=True, methods=['get'], url_path='timelapse-image')
    def timelapse_image(self, request, pk=None):
        """
        Proxies request to fetch the raw JPEG binary frame for a given timestamp.
        GET /api/cameras/{pk}/timelapse-image/?view=21&timestamp=20260902190507
        """
        camera = self.get_object()

        view_id = request.query_params.get('view')
        timestamp = request.query_params.get('timestamp')

        if not timestamp:
            return Response(
                {"detail": "Timestamp query parameter is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        matching_view = None
        if view_id:
            matching_view = camera.views.filter(id=view_id).first()
            
        if not matching_view:
            matching_view = camera.views.first()

        if not matching_view or not matching_view.drivebc_webcam_id:
            return Response(
                {"detail": "No valid DriveBC webcam ID found for this view."},
                status=status.HTTP_400_BAD_REQUEST
            )

        webcam_id = matching_view.drivebc_webcam_id
        
        # Construct target upstream URL for the single frame
        target_url = f"https://dev.drivebc.ca/api/webcams/{webcam_id}/admin-timelapse/{timestamp}/"

        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        }

        # Pass the authenticated cookie
        dev_cookie = '_sp_id.c9fa=e979428a-9465-4c79-bb25-af71ed58f91e.1755809246.173.1787850737.1787841103.6807b620-30bf-4f52-8a5b-2744568e749b; csrftoken=QhwdCfSbhoP0xOoyAp5EQS96Mu9bYMS1; sessionid=9hn0ln4d18cx80lrw7ng21try7g4jd16'
        if dev_cookie:
            headers['Cookie'] = dev_cookie

        try:
            # Fetch binary response from upstream
            resp = requests.get(target_url, headers=headers, stream=True, timeout=10)

            if resp.status_code != 200:
                return Response(
                    {"detail": f"Upstream API returned status {resp.status_code}"},
                    status=status.HTTP_502_BAD_GATEWAY
                )

            # Return raw image stream directly to frontend
            return HttpResponse(
                resp.content,
                content_type=resp.headers.get('Content-Type', 'image/jpeg')
            )

        except requests.RequestException as e:
            return Response(
                {"detail": f"Failed to fetch image frame: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )
        
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



def camera_image_proxy(request, webcam_id):
    url = f"https://www.drivebc.ca/images/{webcam_id}.jpg"
    params = {"t": request.GET.get("t", "")}
    resp = requests.get(url, params=params, timeout=5)
    if resp.status_code != 200:
        return HttpResponseNotFound()
    return HttpResponse(resp.content, content_type=resp.headers.get("Content-Type", "image/jpeg"))