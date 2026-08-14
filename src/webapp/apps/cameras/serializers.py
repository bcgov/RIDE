from rest_framework import serializers
from .models import Camera, CameraView, Region, Road

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
        fields = ["id", "name", "description"]

class CameraSerializer(serializers.ModelSerializer):
    views = CameraViewSerializer(many=True, required=False)
    road = RoadSerializer(read_only=True)
    region = RegionSerializer(read_only=True)

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