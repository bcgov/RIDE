from django.urls import path
from rest_framework import routers

from .views import Events

router = routers.SimpleRouter(trailing_slash=False)
router.register('events', Events)

urlpatterns = router.urls
