from rest_framework import routers

from .views import Events, Pending, Notes, TrafficImpacts, RoadConditions, Conditions

router = routers.SimpleRouter(trailing_slash=False)
router.register('events/pending', Pending, basename='pending')
router.register('events', Events)
router.register('rcs', RoadConditions, basename='rcs')
router.register('notes', Notes)
router.register('traffic-impacts', TrafficImpacts)
router.register('conditions', Conditions)

urlpatterns = router.urls
