from rest_framework import routers

from apps.segments.views import SegmentAPIView

router = routers.SimpleRouter(trailing_slash=False)
router.register('segments', SegmentAPIView)

urlpatterns = router.urls
