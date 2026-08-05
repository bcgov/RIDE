from django.urls import path
from rest_framework import routers

from .views import Crossroads, Landmarks, search

router = routers.SimpleRouter(trailing_slash=False)
router.register('landmarks', Landmarks, basename='landmarks')
router.register('crossroads', Crossroads, basename='crossroads')

urlpatterns = router.urls
urlpatterns.append(path('search', search))
