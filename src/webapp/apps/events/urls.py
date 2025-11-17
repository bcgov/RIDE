from django.urls import path
from rest_framework import routers

from .views import Events, Pending, Notes, TrafficImpacts

router = routers.SimpleRouter(trailing_slash=False)
router.register('events/pending', Pending, basename='pending')
router.register('events', Events)
router.register('notes', Notes)
router.register('traffic-impacts', TrafficImpacts)

urlpatterns = router.urls
