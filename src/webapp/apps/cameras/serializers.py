from rest_framework import serializers
from .models import Camera, CameraView, Region, CameraType, CameraMake, Road, RoadMaintenanceContractor, BusinessArea, ElectricalContractor, ConnectionType, ConnectionProtocol, CommunicationType, PowerSource, CommunicationDevice, Antenna, ServiceProvider, CameraNote, CameraLog, CameraHistory

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

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if views_data is not None:
            existing_views = {view.id: view for view in instance.views.all()}

            for view_data in views_data:
                view_id = view_data.get('id')

                if view_id and view_id in existing_views:
                    view_instance = existing_views[view_id]
                    for attr, value in view_data.items():
                        setattr(view_instance, attr, value)
                    view_instance.save()
                else:
                    view_data.pop('id', None)
                    CameraView.objects.create(camera=instance, **view_data)

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
                actions.append({
                    "type": obj.action_type,
                    "text": obj.description,
                    "subtext": (
                        f"{change.get('old')} → "
                        f"{change.get('new')}"
                    ),
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