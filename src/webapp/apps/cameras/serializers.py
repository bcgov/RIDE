from rest_framework import serializers
from .models import Camera, CameraReportSettings, CameraView, Region, CameraType, CameraMake, Road, RoadMaintenanceContractor, BusinessArea, ElectricalContractor, ConnectionType, ConnectionProtocol, CommunicationType, PowerSource, CommunicationDevice, Antenna, ServiceProvider, CameraNote, CameraLog, CameraHistory, ServiceRequestCcs, CameraDefaultMessaging


class CameraViewSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False, allow_null=True)

    class Meta:
        model = CameraView
        fields = [
            'id',
            'description',
            'orientation',
            'image_url',
            'display_order',
            'is_on',
            'is_default',
            'drivebc_webcam_id',
            'disabled_reason',
            'disabled_short_description',
            'disabled_long_description',
            'last_update_attempt',
            'last_update_modified',
            'camera_id',
        ]

class RoadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Road
        fields = ["id", "name", "code"]

class RegionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Region
        fields = ["id", "name", "description", "is_active"]

class CameraTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraType
        fields = ['id', 'name']


class ConnectionTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraType
        fields = ['id', 'name']

class ConnectionProtocolSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConnectionProtocol
        fields = ['id', 'name']

class CommunicationTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationType
        fields = ['id', 'name']

class PowerSourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = PowerSource
        fields = ['id', 'name']

class CommunicationDeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunicationDevice
        fields = ['id', 'name']

class AntennaeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Antenna
        fields = ['id', 'name']

class ServiceProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceProvider
        fields = ['id', 'name']

class CameraMakeSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraMake
        fields = ['id', 'name']

class RoadMaintenanceContractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoadMaintenanceContractor
        fields = ["id", "name", "description", "is_active", "contact_email", "contact_phone"]

class BusinessAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessArea
        fields = ["id", "name", "description", "is_active", "code"]

class ElectricalContractorSerializer(serializers.ModelSerializer):
    class Meta:
        model = ElectricalContractor
        fields = ["id", "name", "description", "is_active", "contact_email", "contact_phone"]

class CameraSerializer(serializers.ModelSerializer):
    views = CameraViewSerializer(many=True, required=False)

    road = RoadSerializer(read_only=True)
    road_id = serializers.PrimaryKeyRelatedField(
        queryset=Road.objects.all(),
        source='road',
        write_only=True,
        required=False,
        allow_null=True,
    )

    region = RegionSerializer(read_only=True)
    region_id = serializers.PrimaryKeyRelatedField(
        queryset=Region.objects.all(),
        source='region',
        write_only=True,
        required=False,
        allow_null=True,
    )

    camera_type = CameraTypeSerializer(read_only=True)
    camera_type_id = serializers.PrimaryKeyRelatedField(
        queryset=CameraType.objects.all(),
        source='camera_type',
        write_only=True,
        required=False,
        allow_null=True,
    )

    camera_make = CameraMakeSerializer(read_only=True)
    camera_make_id = serializers.PrimaryKeyRelatedField(
        queryset=CameraMake.objects.all(),
        source='camera_make',
        write_only=True,
        required=False,
        allow_null=True,
    )

    connection_type = ConnectionTypeSerializer(read_only=True)
    connection_type_id = serializers.PrimaryKeyRelatedField(
        queryset=ConnectionType.objects.all(),
        source='connection_type',
        write_only=True,
        required=False,
        allow_null=True,
    )

    communication_type = CommunicationTypeSerializer(read_only=True)
    communication_type_id = serializers.PrimaryKeyRelatedField(
        queryset=CommunicationType.objects.all(),
        source='communication_type',
        write_only=True,
        required=False,
        allow_null=True,
    )

    power_source = PowerSourceSerializer(read_only=True)
    power_source_id = serializers.PrimaryKeyRelatedField(
        queryset=PowerSource.objects.all(),
        source='power_source',
        write_only=True,
        required=False,
        allow_null=True,
    )

    communication_device = CommunicationDeviceSerializer(read_only=True)
    communication_device_id = serializers.PrimaryKeyRelatedField(
        queryset=CommunicationDevice.objects.all(),
        source='communication_device',
        write_only=True,
        required=False,
        allow_null=True,
    )

    antenna = AntennaeSerializer(read_only=True)
    antenna_id = serializers.PrimaryKeyRelatedField(
        queryset=Antenna.objects.all(),
        source='antenna',
        write_only=True,
        required=False,
        allow_null=True,
    )

    service_provider = ServiceProviderSerializer(read_only=True)
    service_provider_id = serializers.PrimaryKeyRelatedField(
        queryset=ServiceProvider.objects.all(),
        source='service_provider',
        write_only=True,
        required=False,
        allow_null=True,
    )



    connection_protocol = ConnectionProtocolSerializer(read_only=True)
    connection_protocol_id = serializers.PrimaryKeyRelatedField(
        queryset=ConnectionProtocol.objects.all(),
        source='connection_protocol',
        write_only=True,
        required=False,
        allow_null=True,
    )

    road_maintenance_contractor = RoadMaintenanceContractorSerializer(read_only=True)
    road_maintenance_contractor_id = serializers.PrimaryKeyRelatedField(
        queryset=RoadMaintenanceContractor.objects.all(),
        source='road_maintenance_contractor',
        write_only=True,
        required=False,
        allow_null=True,
    )

    business_area = BusinessAreaSerializer(read_only=True)
    business_area_id = serializers.PrimaryKeyRelatedField(
            queryset=BusinessArea.objects.all(),
            source='business_area',
            write_only=True,
            required=False,
            allow_null=True,
        )

    electrical_contractor = ElectricalContractorSerializer(read_only=True)
    electrical_contractor_id = serializers.PrimaryKeyRelatedField(
            queryset=ElectricalContractor.objects.all(),
            source='electrical_contractor',
            write_only=True,
            required=False,
            allow_null=True,
        )

    class Meta:
        model = Camera
        fields = '__all__'

    # Required for POST requests with nested views
    def create(self, validated_data):
        views_data = validated_data.pop('views', [])
        
        # 1. Create the Camera
        camera = Camera.objects.create(**validated_data)

        # 2. Create nested CameraView records
        for view_data in views_data:
            # Remove temporary client ID if present
            view_data.pop('id', None)
            CameraView.objects.create(camera=camera, **view_data)

        return camera

    # Required for PATCH / PUT requests with nested views
    def update(self, instance, validated_data):
        views_data = validated_data.pop('views', None)

        # Update Camera
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        instance.save()

        # Update CameraViews
        if views_data is not None:
            existing_views = {
                view.id: view
                for view in instance.views.all()
            }

            for view_data in views_data:
                view_id = view_data.get('id')

                if view_id and view_id in existing_views:
                    view_instance = existing_views[view_id]

                    for attr, value in view_data.items():
                        setattr(view_instance, attr, value)

                    view_instance.save()

                else:
                    view_data.pop('id', None)

                    CameraView.objects.create(
                        camera=instance,
                        **view_data
                    )

        return instance

class CameraNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)

    class Meta:
        model = CameraNote
        fields = ['id', 'camera', 'author', 'author_name', 'content', 'created', 'updated']
        read_only_fields = ['camera', 'author', 'created', 'updated']

class CameraLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraLog
        fields = [
            "id",
            "timestamp",
            "message",
            "is_error",
        ]

class CameraHistorySerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    timestamp = serializers.DateTimeField(
        source="created_at"
    )
    sections = serializers.SerializerMethodField()

    class Meta:
        model = CameraHistory
        fields = [
            "id",
            "timestamp",
            "user",
            "sections",
        ]

    def get_user(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username

        return "Unknown user"

    def get_sections(self, obj):
        actions = []
        changes = obj.changes or {}

        if changes:
            for field, change in changes.items():
                old, new = self._parse_change(change)
                actions.append({
                    "type": obj.action_type,
                    "text": obj.description,
                    "subtext": f"{old} → {new}",
                })
        else:
            actions.append({
                "type": obj.action_type,
                "text": obj.description,
                "subtext": "",
            })

        return [
            {
                "category": obj.category,
                "actions": actions,
            }
        ]

    def _parse_change(self, change):
        """Normalize a change entry into (old, new), regardless of
        whether it was stored as a dict or a list/tuple."""
        if isinstance(change, dict):
            return change.get("old"), change.get("new")
        if isinstance(change, (list, tuple)):
            if len(change) == 2:
                return change[0], change[1]
            return change, None
        return change, None

class CameraReportSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraReportSettings
        fields = ['selected_fields']

class ServiceRequestCcsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceRequestCcs
        fields = ['service_request_ccs']

class CameraDefaultMessagingSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraDefaultMessaging
        fields = [
            'disabled_reason_default',
            'disabled_short_description',
            'disabled_long_description',
        ]

class CameraOrderItemSerializer(serializers.Serializer):
    """One entry in the reorder payload: {"id": 12, "display_order": 3}"""
    id = serializers.IntegerField()
    display_order = serializers.IntegerField()


class CamerasOrderSerializer(serializers.Serializer):
    """Validates the bulk reorder request body:
    {"cameras": [{"id": 1, "display_order": 0}, {"id": 2, "display_order": 1}, ...]}
    """
    cameras = CameraOrderItemSerializer(many=True)

    def save(self):
        camera_data = self.validated_data['cameras']
        updated_ids = [item['id'] for item in camera_data]

        cameras = {c.id: c for c in Camera.objects.filter(id__in=updated_ids)}

        to_update = []
        for item in camera_data:
            cam = cameras.get(item['id'])
            if cam:
                cam.display_order = item['display_order']
                to_update.append(cam)

        Camera.objects.bulk_update(to_update, ['display_order'])
        return Camera.objects.filter(id__in=updated_ids).order_by('display_order')


class CameraOrderReadSerializer(serializers.ModelSerializer):
    """Shapes the response — matches what the frontend expects
    (cam.title, cam.region.name, cam.road.name, cam.display_order)."""
    region = serializers.SerializerMethodField()
    road = serializers.SerializerMethodField()

    class Meta:
        model = Camera
        fields = ['id', 'title', 'region', 'road', 'display_order']

    def get_region(self, obj):
        return {'name': obj.region.name} if obj.region_id else None

    def get_road(self, obj):
        return {'name': obj.road.name} if obj.road_id else None