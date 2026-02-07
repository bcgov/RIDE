from rest_framework import serializers

from apps.organizations.models import Organization, ServiceArea


class UserOrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ["id", "name"]


class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = "__all__"

    # Case-insensitive unique validation for 'name' field
    def validate_name(self, value):
        qs = Organization.objects.filter(name__iexact=value)

        # Exclude the current instance when updating
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)

        if qs.exists():
            raise serializers.ValidationError("Organization name must be unique (case-insensitive).")

        return value


class ServiceAreaSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceArea
        fields = "__all__"
