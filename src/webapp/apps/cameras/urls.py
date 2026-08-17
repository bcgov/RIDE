from rest_framework.routers import DefaultRouter

from .views import CameraViewSet, RegionViewSet, RoadMaintenanceContractorViewSet, RoadViewSet, BusinessAreaViewSet, ElectricalContractorViewSet, CameraTypeViewSet, CameraMakeViewSet, ConnectionTypeViewSet, ConnectionProtocolViewSet

router = DefaultRouter()
router.register(r"cameras", CameraViewSet, basename="camera")
router.register(r'regions', RegionViewSet, basename='region')
router.register(r'roads', RoadViewSet, basename='road')
router.register(r'road-maintenance-contractors', RoadMaintenanceContractorViewSet, basename='road-maintenance-contractor')
router.register(r'business-areas', BusinessAreaViewSet, basename='business-area')
router.register(r'electrical-contractors', ElectricalContractorViewSet, basename='electrical-contractor')
router.register(r'camera-types', CameraTypeViewSet)
router.register(r'camera-makes', CameraMakeViewSet)
router.register(r'connection-types', ConnectionTypeViewSet)
router.register(r'connection-protocols', ConnectionProtocolViewSet)

urlpatterns = router.urls