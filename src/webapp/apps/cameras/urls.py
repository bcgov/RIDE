from django.urls import path

from rest_framework.routers import DefaultRouter

from .views import CameraReportSettingsViewSet, CameraViewSet, RegionViewSet, RoadMaintenanceContractorViewSet, RoadViewSet, BusinessAreaViewSet, ElectricalContractorViewSet, CameraTypeViewSet, CameraMakeViewSet, ConnectionTypeViewSet, ConnectionProtocolViewSet, CommunicationTypeViewSet, PowerSourceViewSet, CommunicationDeviceViewSet, AntennaeViewSet, ServiceProviderViewSet, CameraNoteViewSet, CameraLogViewSet, CameraHistoryViewSet, ServiceRequestCcsViewSet

router = DefaultRouter()
router.register(r"cameras", CameraViewSet, basename="camera")
router.register(r'regions', RegionViewSet, basename='region')
router.register(r'roads-and-highways', RoadViewSet, basename='roads-and-highways')
router.register(r'road-maintenance-contractors', RoadMaintenanceContractorViewSet, basename='road-maintenance-contractor')
router.register(r'business-areas', BusinessAreaViewSet, basename='business-area')
router.register(r'electrical-contractors', ElectricalContractorViewSet, basename='electrical-contractor')
router.register(r'camera-types', CameraTypeViewSet)
router.register(r'camera-makes', CameraMakeViewSet)
router.register(r'connection-types', ConnectionTypeViewSet)
router.register(r'connection-protocols', ConnectionProtocolViewSet)
router.register(r'communication-types', CommunicationTypeViewSet)
router.register(r'power-sources', PowerSourceViewSet)
router.register(r'communication-devices', CommunicationDeviceViewSet)
router.register(r'antennaes', AntennaeViewSet)
router.register(r'service-providers', ServiceProviderViewSet)
router.register(r'cameras/(?P<camera_id>[^/.]+)/notes', CameraNoteViewSet, basename='camera-notes')
router.register(r'cameras/(?P<camera_id>[^/.]+)/logs', CameraLogViewSet, basename='camera-logs')
router.register(r"cameras/(?P<camera_id>[^/.]+)/history", CameraHistoryViewSet, basename="camera-history")
router.register(r"camera-report-settings", CameraReportSettingsViewSet, basename="camera-report-settings")
# router.register(r"service-request-ccs", ServiceRequestCcsViewSet, basename="service-request-ccs")
urlpatterns = router.urls
urlpatterns += [
    path(
        "service-request-ccs/",
        ServiceRequestCcsViewSet.as_view({
            "get": "list",
            "put": "update",
            "patch": "partial_update",
        }),
        name="service-request-ccs",
    ),
]