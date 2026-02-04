from rest_framework import routers

from apps.segments.views import SegmentAPIView, RouteAPIView

router = routers.SimpleRouter(trailing_slash=False)
router.register('segments', SegmentAPIView, basename='segments')
router.register('routes', RouteAPIView, basename='routes')

urlpatterns = router.urls
