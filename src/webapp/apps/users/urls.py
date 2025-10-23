from rest_framework import routers

from apps.users.views import RIDEUserAPIView, RIDEGroupAPIView

router = routers.SimpleRouter(trailing_slash=False)
router.register('users', RIDEUserAPIView)
router.register('groups', RIDEGroupAPIView)

urlpatterns = router.urls
