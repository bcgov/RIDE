from types import SimpleNamespace

from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from django.test import TestCase, SimpleTestCase

from apps.users.serializers import RIDEUserSerializer
from config.adapter import get_oidc_claims


class TestGetOidcClaims(SimpleTestCase):
    def test_returns_legacy_flat_claims(self):
        claims = {'idir_username': 'legacy-user'}
        account = SimpleNamespace(extra_data=claims)

        self.assertEqual(get_oidc_claims(account), claims)

    def test_returns_userinfo_without_id_token_claims(self):
        account = SimpleNamespace(extra_data={
            'id_token': {'idir_username': 'token-user', 'email': 'token@example.com'},
            'userinfo': {'idir_username': 'info-user', 'email': 'info@example.com'},
        })

        self.assertEqual(get_oidc_claims(account), account.extra_data['userinfo'])

    def test_empty_userinfo_does_not_fall_back_to_id_token(self):
        account = SimpleNamespace(extra_data={
            'id_token': {'idir_username': 'token-user'},
            'userinfo': {},
        })

        self.assertEqual(get_oidc_claims(account), {})

    def test_returns_empty_mapping_for_empty_extra_data(self):
        account = SimpleNamespace(extra_data=None)

        self.assertEqual(get_oidc_claims(account), {})

    def test_accepts_sociallogin_wrapper(self):
        account = SimpleNamespace(extra_data={'userinfo': {'idir_username': 'wrapped-user'}})
        sociallogin = SimpleNamespace(account=account)

        self.assertEqual(get_oidc_claims(sociallogin), {'idir_username': 'wrapped-user'})


class TestRIDEUserSerializerSocialUsername(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='test-user',
            password='test-password',
        )
        self.serializer = RIDEUserSerializer()

    def test_reads_nested_idir_username(self):
        SocialAccount.objects.create(
            user=self.user,
            provider='keycloak',
            uid='idir-user',
            extra_data={'userinfo': {'idir_username': 'IDIR_USER'}},
        )

        self.assertEqual(self.serializer.get_social_username(self.user), 'IDIR_USER')

    def test_reads_nested_bceid_username(self):
        SocialAccount.objects.create(
            user=self.user,
            provider='bceid',
            uid='bceid-user',
            extra_data={'userinfo': {'bceid_username': 'BCEID_USER'}},
        )

        self.assertEqual(self.serializer.get_social_username(self.user), 'BCEID_USER')

    def test_reads_legacy_flat_username(self):
        SocialAccount.objects.create(
            user=self.user,
            provider='keycloak',
            uid='legacy-user',
            extra_data={'idir_username': 'LEGACY_USER'},
        )

        self.assertEqual(self.serializer.get_social_username(self.user), 'LEGACY_USER')

    def test_returns_empty_string_without_social_account(self):
        self.assertEqual(self.serializer.get_social_username(self.user), '')