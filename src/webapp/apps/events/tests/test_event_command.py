from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.events.management.commands.event import get_username


class TestEventCommandUsername(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username='test-user',
            password='test-password',
        )

    def test_reads_nested_idir_username(self):
        SocialAccount.objects.create(
            user=self.user,
            provider='keycloak',
            uid='idir-user',
            extra_data={'userinfo': {'idir_username': 'IDIR_USER'}},
        )

        self.assertEqual(get_username(self.user), 'IDIR_USER')

    def test_keeps_bceid_fallback_when_idir_claim_is_missing(self):
        SocialAccount.objects.create(
            user=self.user,
            provider='bceid',
            uid='bceid-user',
            extra_data={'userinfo': {'bceid_username': 'BCEID_USER'}},
        )

        self.assertEqual(get_username(self.user), 'BCeID')

    def test_keeps_django_fallback_without_social_account(self):
        self.assertEqual(get_username(self.user), 'Django')