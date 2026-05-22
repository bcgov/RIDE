from django.urls import path
from rest_framework import routers

from .views import Landmarks, search

router = routers.SimpleRouter(trailing_slash=False)
router.register('landmarks', Landmarks, basename='landmarks')

urlpatterns = router.urls
urlpatterns.append(path('search', search))
