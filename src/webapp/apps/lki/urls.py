from rest_framework import routers

from .views import Landmarks

router = routers.SimpleRouter(trailing_slash=False)
router.register('landmarks', Landmarks, basename='landmarks')

urlpatterns = router.urls
