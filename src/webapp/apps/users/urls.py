from django.urls import path
from rest_framework import routers

from apps.users.views import RIDEUserAPIView, RIDEGroupAPIView, make_request

router = routers.SimpleRouter(trailing_slash=False)
router.register('users', RIDEUserAPIView)
router.register('groups', RIDEGroupAPIView)

urlpatterns = [
    path('users/request', make_request)
] + router.urls
