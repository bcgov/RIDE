from debug_toolbar.toolbar import debug_toolbar_urls
from django.conf import settings
from django.contrib import admin
from django.urls import path, include

from allauth.account.views import logout
from allauth.account.decorators import secure_admin_login
from allauth.account import views as account_views
from allauth.urls import build_provider_urlpatterns


from apps.ride.views import home, cameras
from apps.events import urls as event_urls
from apps.users import urls as user_urls
from apps.organizations import urls as organization_urls
from apps.segments import urls as segment_urls
from apps.users.views import session

admin.autodiscover()
admin.site.login = secure_admin_login(admin.site.login)

urlpatterns = [
    path('admin/logout/', logout),
    path('admin/', admin.site.urls),
    path('api/', include((event_urls, 'events'), namespace='events')),
    path('api/', include((user_urls, 'users'), namespace='users')),
    path('api/', include((organization_urls, 'organizations'), namespace='organizations')),
    path('api/', include((segment_urls, 'segments'), namespace='segments')),
    path('cameras/', cameras),
    path('', home),

    # Auth
    path('session', session.as_view()),

] + debug_toolbar_urls()


# Allauth
urlpatterns += [path('accounts/', include(build_provider_urlpatterns()))]
urlpatterns += [path('accounts/logout/', account_views.LogoutView.as_view(), name='account_logout')]

if settings.DEBUG:
    urlpatterns += [
        path('accounts/login/', account_views.LoginView.as_view(), name='account_login'),
        path('accounts/signup/', account_views.SignupView.as_view(), name='account_signup'),
    ]
