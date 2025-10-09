from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.adapter import DefaultAccountAdapter
from django.contrib.auth.signals import user_logged_in
from django.conf import settings
import requests


class DbcAdapter(DefaultAccountAdapter):

    def get_logout_redirect_url(self, request):
        token = request.session.get('id_token')
        url = f'{settings.KEYCLOAK_URL}/protocol/openid-connect/logout?post_logout_redirect_uri={settings.FRONTEND_BASE_URL}&id_token_hint={token}'
        return url


class DbcSocialAdapter(DefaultSocialAccountAdapter):

    def populate_user(self, request, sociallogin, data):
        return super().populate_user(request, sociallogin, data)


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