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


class TestUserEmailSubscriptionSummary(TestCase):
    ''' DBC22-7325: notification settings in the admin users list '''

    def setUp(self):
        from apps.organizations.models import Organization, ServiceArea
        from apps.users.models import EmailSubscription

        self.area = ServiceArea.objects.get(id=8)
        self.org = Organization.objects.create(name='Org A')
        self.org.service_areas.set([self.area])

        self.admin = get_user_model().objects.create_user(username='admin', password='pw',
                                                          is_staff=True, is_superuser=True)
        self.client.force_login(self.admin)

        self.subscribed = get_user_model().objects.create_user(username='subscribed', email='s@gov.bc.ca')
        self.subscribed.organizations.set([self.org])
        subscription = EmailSubscription.objects.create(
            user=self.subscribed, notification=True, notification_types=['incidents'],
            notification_severities=['majorEvents'], notification_statuses=['new'], notification_creator='me')
        subscription.notification_areas.set([self.area])

    def users(self):
        return {user['username']: user for user in self.client.get('/api/users').json()}

    def test_settings_in_users_list(self):
        users = self.users()

        self.assertEqual(users['subscribed']['email_subscription']['notification_areas'], [self.area.id])
        self.assertEqual(users['subscribed']['email_subscription']['notification_creator'], 'me')
        self.assertFalse(users['admin']['email_subscription']['notification'])
        self.assertEqual(users['admin']['email_subscription']['notification_areas'], [])

    def test_no_extra_queries_per_subscription(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        from apps.users.models import EmailSubscription

        other = get_user_model().objects.create_user(username='other', email='o@gov.bc.ca')
        other.organizations.set([self.org])

        with CaptureQueriesContext(connection) as one_subscription:
            self.users()

        subscription = EmailSubscription.objects.create(user=other, notification=True)
        subscription.notification_areas.set([self.area])
        with CaptureQueriesContext(connection) as two_subscriptions:
            self.users()

        self.assertEqual(len(one_subscription), len(two_subscriptions))


class TestSession(TestCase):
    ''' DBC22-7325: the signed-in user's session data '''

    def setUp(self):
        from apps.organizations.models import Organization, ServiceArea
        from apps.users.models import EmailSubscription

        self.area = ServiceArea.objects.get(id=8)
        self.org = Organization.objects.create(name='Org A')
        self.org.service_areas.set([self.area])

        self.user = get_user_model().objects.create_user(username='user', email='u@gov.bc.ca')
        self.user.organizations.set([self.org])
        subscription = EmailSubscription.objects.create(user=self.user, notification=True,
                                                        notification_types=['incidents'])
        subscription.notification_areas.set([self.area])
        self.client.force_login(self.user)

    def test_session_includes_areas_not_settings(self):
        data = self.client.get('/session').json()

        self.assertEqual(data['service_areas'], [self.area.id])
        self.assertNotIn('email_subscription', data)  # loaded from users/email-subscriptions

    def test_session_queries_dont_grow_with_organizations(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        from apps.organizations.models import Organization

        with CaptureQueriesContext(connection) as one_organization:
            self.client.get('/session')

        other = Organization.objects.create(name='Org B')
        other.service_areas.set([self.area])
        self.user.organizations.add(other)
        with CaptureQueriesContext(connection) as two_organizations:
            self.client.get('/session')

        self.assertEqual(len(one_organization), len(two_organizations))

    def test_update_unknown_or_malformed_id_is_404(self):
        admin = get_user_model().objects.create_user(username='admin2', is_staff=True, is_superuser=True)
        self.client.force_login(admin)
        for pk in ('999999', 'abc'):
            response = self.client.patch(f'/api/users/{pk}', {'is_approver': True}, content_type='application/json')
            self.assertEqual(response.status_code, 404)

    def test_area_ids_without_prefetch_is_one_query(self):
        from apps.organizations.models import Organization
        from apps.users.serializers import get_user_notification_area_ids

        other = Organization.objects.create(name='Org B')
        other.service_areas.set([self.area])
        self.user.organizations.add(other)
        user = get_user_model().objects.get(pk=self.user.pk)

        with self.assertNumQueries(1):
            self.assertEqual(get_user_notification_area_ids(user), {self.area.id})

        prefetched = get_user_model().objects.prefetch_related('organizations__service_areas').get(pk=self.user.pk)
        with self.assertNumQueries(0):
            self.assertEqual(get_user_notification_area_ids(prefetched), {self.area.id})


class TestAccessRequest(TestCase):
    ''' DBC22-6697: access request email and granting the requested organization '''

    def setUp(self):
        from apps.organizations.models import Organization

        self.org = Organization.objects.create(name='Org A', contact_name='Pat Contact', contact_id='PCONTACT')
        self.user = get_user_model().objects.create_user(
            username='newuser', email='new@gov.bc.ca', first_name='New', last_name='User')
        self.client.force_login(self.user)

    def request_access(self, organization=None):
        return self.client.post('/api/users/request', {
            'type': 'ADD_TO_ORGANIZATION', 'organization': (organization or self.org).id,
        }, content_type='application/json')

    def users(self):
        admin, _ = get_user_model().objects.get_or_create(username='admin', is_staff=True, is_superuser=True)
        self.client.force_login(admin)
        return {user['username']: user for user in self.client.get('/api/users').json()}

    def test_email(self):
        from django.conf import settings
        from django.core import mail

        self.assertEqual(self.request_access().status_code, 201)

        self.assertEqual(len(mail.outbox), 1)
        msg = mail.outbox[0]
        self.assertEqual(msg.subject, 'A RIDE user has requested to be added to an organization')
        self.assertEqual(msg.from_email, settings.RIDE_NOTIFICATION_FROM_EMAIL_SENDER)
        self.assertEqual(msg.to, settings.ACCESS_REQUEST_RECEIVERS)

        html = msg.alternatives[0][0]
        grant_url = f'{settings.FRONTEND_BASE_URL}users/?grant={self.user.id}'
        users_url = f'{settings.FRONTEND_BASE_URL}users/?user={self.user.id}'
        for body in (msg.body, html):
            self.assertIn(grant_url, body)
            self.assertIn(users_url, body)
            self.assertIn('New User', body)
            self.assertIn('new@gov.bc.ca', body)
            self.assertIn('Org A', body)
            self.assertIn('Pat Contact', body)
            self.assertIn('PCONTACT', body)
        self.assertIn('Grant permission', html)

        # logo, button icon and footer images are inline, not attachments
        self.assertEqual(msg.mixed_subtype, 'related')
        cids = {part['Content-ID'] for part in msg.attachments}
        self.assertTrue({'<ride-logo>', '<circle-check>', '<bclogo>'} <= cids)

    def test_missing_contact(self):
        from apps.organizations.models import Organization
        from django.core import mail

        self.request_access(Organization.objects.create(name='Org B'))
        self.assertIn('Organization’s authoritative contact: Not provided', mail.outbox[0].body)

    def test_requested_organization(self):
        self.request_access()

        user = self.users()['newuser']
        self.assertEqual(user['requested_organization'], self.org.id)
        self.assertFalse(user['request_organization'])

    def test_granting_resolves_the_request(self):
        self.request_access()
        self.users()  # signs in as the admin
        response = self.client.patch(f'/api/users/{self.user.id}', {'organizations': [self.org.id]},
                                     content_type='application/json')
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()['requested_organization'])

        user = self.users()['newuser']
        self.assertIsNone(user['requested_organization'])  # old Grant links do nothing

        # removed from the organization later: asked to request access again
        self.client.patch(f'/api/users/{self.user.id}', {'organizations': []}, content_type='application/json')
        self.assertTrue(self.users()['newuser']['request_organization'])

    def test_assigning_elsewhere_resolves_the_request(self):
        from apps.users.models import Request

        self.request_access()
        self.org.users.add(self.user)  # e.g. Django admin or an import
        self.assertFalse(Request.objects.filter(user=self.user).exists())

    def test_user_with_an_organization_cannot_request(self):
        from django.core import mail
        from apps.users.models import Request

        self.user.organizations.add(self.org)
        response = self.request_access()
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Request.objects.filter(user=self.user).exists())
        self.assertEqual(mail.outbox, [])

    def test_name_falls_back_to_email(self):
        from django.core import mail

        self.user.first_name = self.user.last_name = ''
        self.user.save()
        self.request_access()
        self.assertIn('Name: new@gov.bc.ca', mail.outbox[0].body)

    def test_no_requested_organization(self):
        user = self.users()['newuser']
        self.assertIsNone(user['requested_organization'])
        self.assertTrue(user['request_organization'])

    def test_failed_email_keeps_no_request(self):
        from unittest.mock import patch
        from apps.users.models import Request

        with patch('django.core.mail.backends.locmem.EmailBackend.send_messages', side_effect=ConnectionRefusedError):
            response = self.request_access()
        self.assertEqual(response.status_code, 503)
        self.assertIn('try again', response.json()['detail'])
        self.assertFalse(Request.objects.filter(user=self.user).exists())

        # so the user can ask again
        self.assertEqual(self.request_access().status_code, 201)

    def test_no_extra_queries_per_request(self):
        from django.db import connection
        from django.test.utils import CaptureQueriesContext
        from apps.users.models import Request

        requesters = [get_user_model().objects.create_user(username=username) for username in ('one', 'two')]
        self.users()  # create the admin first
        with CaptureQueriesContext(connection) as no_requests:
            self.users()

        for requester in requesters:
            Request.objects.create(user=requester, details={'organization': self.org.id})
        with CaptureQueriesContext(connection) as two_requests:
            self.users()

        self.assertEqual(len(no_requests), len(two_requests))
