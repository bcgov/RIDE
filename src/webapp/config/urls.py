from debug_toolbar.toolbar import debug_toolbar_urls
from django.contrib import admin
from django.urls import path, include

from allauth.account.views import logout
from allauth.account.decorators import secure_admin_login

from apps.ride.views import home, cameras
from apps.events import urls as event_urls
from apps.users.views import session

admin.autodiscover()
admin.site.login = secure_admin_login(admin.site.login)

urlpatterns = [
    path('admin/logout/', logout),
    path('admin/', admin.site.urls),
    path('api/', include((event_urls, 'events'), namespace='events')),
    path('cameras/', cameras),
    path('accounts/', include('allauth.urls')),
    path('', home),
    path('session', session.as_view()),
] + debug_toolbar_urls()
