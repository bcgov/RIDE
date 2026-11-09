from django.urls import path
from rest_framework import routers

from apps.users.views import (
    EmailSubscriptionViewset,
    RIDEGroupAPIView,
    RIDEUserAPIView,
    make_request,
)

router = routers.SimpleRouter(trailing_slash=False)
# DBC22-7326: registered before 'users' so users/<pk> doesn't capture it
router.register('users/email-subscriptions', EmailSubscriptionViewset)
router.register('users', RIDEUserAPIView)
router.register('groups', RIDEGroupAPIView)

urlpatterns = [
    path('users/request', make_request),
] + router.urls
