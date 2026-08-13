from rest_framework import serializers

from .models import Camera, CameraView

class CameraViewSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraView
        fields = [
            "id",
            "description",
            "orientation",
            "image_url",
            "image_name",
            "display_order",
            "is_on",
            "is_default",
        ]

class CameraSerializer(serializers.ModelSerializer):
    views = CameraViewSerializer(many=True, read_only=True)

    class Meta:
        model = Camera
        fields = "__all__"