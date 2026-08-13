from rest_framework import serializers
from .models import Camera, CameraView

class CameraViewSerializer(serializers.ModelSerializer):
    # Specify id explicitly so DRF doesn't throw a validation error during update
    id = serializers.IntegerField(required=False)

    class Meta:
        model = CameraView
        fields = [
            'id',
            'description',
            'orientation',
            'image_url',
            'image_name',
            'display_order',
            'is_on',
            'is_default',
        ]

class CameraSerializer(serializers.ModelSerializer):
    views = CameraViewSerializer(many=True, required=False)

    class Meta:
        model = Camera
        fields = '__all__'

    def update(self, instance, validated_data):
        # Extract views array from incoming payload
        views_data = validated_data.pop('views', None)

        # 1. Update Camera model standard fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # 2. Update nested CameraView records
        if views_data is not None:
            existing_views = {view.id: view for view in instance.views.all()}

            for view_data in views_data:
                view_id = view_data.get('id')

                if view_id and view_id in existing_views:
                    # Update existing CameraView instance
                    view_instance = existing_views[view_id]
                    for attr, value in view_data.items():
                        setattr(view_instance, attr, value)
                    view_instance.save()
                else:
                    # Create new CameraView if it didn't exist before
                    CameraView.objects.create(camera=instance, **view_data)

        return instance