from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.models import SocialAccount
from django.contrib.auth.signals import user_logged_in
from django.conf import settings
import requests
from django.http import HttpResponseRedirect

from apps.users.models import RIDEUser


class RideAdapter(DefaultAccountAdapter):
    def get_logout_redirect_url(self, request):
        token = request.session.get('id_token')
        url = f'{settings.KEYCLOAK_URL}/protocol/openid-connect/logout?post_logout_redirect_uri={settings.FRONTEND_BASE_URL}&id_token_hint={token}'
        return url

    def respond_user_inactive(self, request, user):
        return HttpResponseRedirect(settings.FRONTEND_BASE_URL + '?inactive=true')


class RideSocialAdapter(DefaultSocialAccountAdapter):
    def pre_social_login(self, request, sociallogin):
        """
        Overridden hook to lookup import DIT users by idir_username or bceid_username
        """
        social_data = sociallogin.account.extra_data
        isIdir = social_data['identity_provider'] == 'azureidir'
        username = 'idir__' + social_data['idir_username'] \
            if isIdir else 'bceid__' + social_data['bceid_username']

        ride_user = RIDEUser.objects.filter(username__iexact=username).first()

        # No existing DIT user, do nothing
        if not ride_user:
            return

        # User already linked, do nothing
        if SocialAccount.objects.filter(
            provider=sociallogin.account.provider,
            uid=sociallogin.account.uid,
        ).exclude(user=ride_user).exists():
            return

        # Link imported DIT user to social account
        sociallogin.connect(request, ride_user)

    def populate_user(self, request, sociallogin, data):
        user = super().populate_user(request, sociallogin, data)

        social_data = sociallogin.account.extra_data or {}
        identity_provider = social_data.get('identity_provider')
        given_name = (social_data.get('given_name') or '').strip()
        family_name = (social_data.get('family_name') or '').strip()
        display_name = (social_data.get('display_name') or social_data.get('name') or '').strip()

        # DBC22-5775
        # BCeID can send the full name in given_name while family_name is blank.
        # Normalize so UI displays "First Last" instead of "First Last Last".
        if identity_provider == 'bceidboth' and not family_name:
            source_name = given_name or display_name
            name_parts = source_name.split()
            if len(name_parts) > 1:
                user.first_name = name_parts[0]
                user.last_name = ' '.join(name_parts[1:])
            elif source_name:
                user.first_name = source_name
                user.last_name = ''

        return user

def store_id_token(sender, **kwargs):
    user = kwargs.get('user')
    request = kwargs.get('request')
    account = user.socialaccount_set.first()

    if account:
        token = account.socialtoken_set.first()

        res = requests.post(
            f'{settings.KEYCLOAK_URL}/protocol/openid-connect/token',
            data={
                'grant_type': 'refresh_token',
                'client_id': settings.KEYCLOAK_CLIENT_ID,
                'client_secret': settings.KEYCLOAK_SECRET,
                'refresh_token': token.token_secret,
            }
        )
        data = res.json()
        token.token = data.get('access_token')
        token.token_secret = data.get('refresh_token')
        token.save()
        request.session['id_token'] = data.get('id_token')


user_logged_in.connect(store_id_token, weak=False)