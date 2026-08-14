from rest_framework.routers import DefaultRouter

from .views import CameraViewSet, RegionViewSet, RoadViewSet

router = DefaultRouter()
router.register(r"cameras", CameraViewSet, basename="camera")
router.register(r'regions', RegionViewSet, basename='region')
router.register(r'roads', RoadViewSet, basename='road')

urlpatterns = router.urls