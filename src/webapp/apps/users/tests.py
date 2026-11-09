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


class TestEmailSubscriptions(TestCase):
    ''' DBC22-7326: users' own notification settings API '''

    url = '/api/users/email-subscriptions'

    def setUp(self):
        from apps.organizations.models import Organization, ServiceArea

        # from the service areas fixture loaded by migrations
        self.area = ServiceArea.objects.get(id=8)
        self.other_area = ServiceArea.objects.get(id=9)
        self.org = Organization.objects.create(name='Org A')
        self.org.service_areas.set([self.area])

        self.user = get_user_model().objects.create_user(username='user', email='user@gov.bc.ca', password='pw')
        self.user.organizations.set([self.org])
        self.client.force_login(self.user)

    def payload(self, **kwargs):
        return {
            'notification': True,
            'notification_areas': [self.area.id],
            'notification_types': ['incidents', 'plannedEvents', 'roadConditions', 'chainUps'],
            'notification_severities': ['closures', 'majorEvents', 'minorEvents'],
            'notification_statuses': ['overdue', 'updateDueSoon', 'new', 'updated', 'cleared',
                                      'reconfirmed', 'approvalPending', 'approved'],
            'notification_creator': 'all',
            **kwargs,
        }

    def test_requires_login(self):
        self.client.logout()
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_create_list_and_update(self):
        self.assertEqual(self.client.get(self.url).json(), [])

        response = self.client.post(self.url, self.payload(), content_type='application/json')
        self.assertEqual(response.status_code, 201)
        subscription_id = response.json()['id']

        listed = self.client.get(self.url).json()
        self.assertEqual(len(listed), 1)
        self.assertEqual(listed[0]['notification_areas'], [self.area.id])

        response = self.client.patch(f'{self.url}/{subscription_id}',
                                     {'notification_creator': 'me'}, content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['notification_creator'], 'me')

        # only one subscription per user
        response = self.client.post(self.url, self.payload(), content_type='application/json')
        self.assertEqual(response.json(), {'code': 'duplicate_subscription'})

    def test_simultaneous_create_is_a_duplicate(self):
        from unittest.mock import patch
        from django.db.models import QuerySet
        from apps.users.models import EmailSubscription

        EmailSubscription.objects.create(user=self.user)

        # the other request's insert lands between the check and this insert
        with patch.object(QuerySet, 'exists', return_value=False):
            response = self.client.post(self.url, self.payload(), content_type='application/json')

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json(), {'code': 'duplicate_subscription'})

    def test_turning_off_clears_settings(self):
        subscription_id = self.client.post(self.url, self.payload(), content_type='application/json').json()['id']
        response = self.client.patch(f'{self.url}/{subscription_id}', {'notification': False},
                                     content_type='application/json')
        self.assertEqual(response.json()['notification_types'], [])
        self.assertEqual(response.json()['notification_areas'], [])

    def test_areas_outside_organizations_are_dropped(self):
        response = self.client.post(self.url, self.payload(notification_areas=[self.area.id, self.other_area.id]),
                                    content_type='application/json')
        self.assertEqual(response.json()['notification_areas'], [self.area.id])

        # areas the organization loses no longer show or block saving
        subscription_id = response.json()['id']
        self.org.service_areas.add(self.other_area)
        self.client.patch(f'{self.url}/{subscription_id}', {'notification_areas': [self.area.id, self.other_area.id]},
                          content_type='application/json')
        self.org.service_areas.remove(self.other_area)
        self.assertEqual(self.client.get(self.url).json()[0]['notification_areas'], [self.area.id])
        response = self.client.patch(f'{self.url}/{subscription_id}', {'notification_creator': 'me'},
                                     content_type='application/json')
        self.assertEqual(response.status_code, 200)

    def test_validation(self):
        response = self.client.post(self.url, self.payload(notification_types=[], notification_areas=[]),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('notification_types', response.json())
        self.assertIn('notification_areas', response.json())

        # severity is only needed for incidents and planned events
        response = self.client.post(self.url, self.payload(notification_types=['roadConditions'],
                                                           notification_severities=[]),
                                    content_type='application/json')
        self.assertEqual(response.status_code, 201)

    def test_email_required(self):
        self.user.email = ''
        self.user.save()
        response = self.client.post(self.url, self.payload(), content_type='application/json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('notification', response.json())
