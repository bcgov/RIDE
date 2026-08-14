from rest_framework.routers import DefaultRouter

from .views import CameraViewSet, RegionViewSet, RoadMaintenanceContractorViewSet, RoadViewSet, BusinessAreaViewSet

router = DefaultRouter()
router.register(r"cameras", CameraViewSet, basename="camera")
router.register(r'regions', RegionViewSet, basename='region')
router.register(r'roads', RoadViewSet, basename='road')
router.register(r'road-maintenance-contractors', RoadMaintenanceContractorViewSet, basename='road-maintenance-contractor')
router.register(r'business-areas', BusinessAreaViewSet, basename='business-area')

urlpatterns = router.urls