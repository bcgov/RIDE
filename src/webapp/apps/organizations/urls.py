from rest_framework import routers

from apps.organizations.views import DistrictAPIView, OrganizationAPIView, ServiceAreaAPIView

router = routers.SimpleRouter(trailing_slash=False)
router.register('districts', DistrictAPIView, basename='districts')
router.register('organizations', OrganizationAPIView, basename='organizations')
router.register('service_areas', ServiceAreaAPIView, basename='service_areas')

urlpatterns = router.urls
