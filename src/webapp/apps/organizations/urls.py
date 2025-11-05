from rest_framework import routers

from apps.organizations.views import OrganizationAPIView, ServiceAreaAPIView

router = routers.SimpleRouter(trailing_slash=False)
router.register('organizations', OrganizationAPIView)
router.register('service_areas', ServiceAreaAPIView)

urlpatterns = router.urls
