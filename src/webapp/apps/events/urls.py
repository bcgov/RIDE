from django.urls import path
from rest_framework import routers

from .views import Events, Notes

router = routers.SimpleRouter(trailing_slash=False)
router.register('events', Events)
router.register('notes', Notes)

urlpatterns = router.urls
