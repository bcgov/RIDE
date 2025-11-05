from rest_framework import permissions
from rest_framework.viewsets import ModelViewSet

from apps.organizations.models import Organization, ServiceArea
from apps.organizations.serializers import OrganizationSerializer, ServiceAreaSerializer


class OrganizationAPIView(ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAdminUser]


class ServiceAreaAPIView(ModelViewSet):
    queryset = ServiceArea.objects.all()
    serializer_class = ServiceAreaSerializer
    permission_classes = [permissions.IsAdminUser]
