from io import StringIO

from allauth.socialaccount.models import SocialAccount
from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings

from apps.events.management.commands.seed_data import Command


class TestGrantAdmins(TestCase):
    def setUp(self):
        # Migrations create taskuser
        self.existing = get_user_model().objects.count()

    def new_users(self):
        return get_user_model().objects.count() - self.existing

    def grant(self):
        command = Command(stdout=StringIO(), stderr=StringIO())
        command.grant_admins()
        return command.stdout.getvalue()

    @override_settings(RIDE_ADMIN_IDIRS=[])
    def test_does_nothing_when_unset(self):
        self.grant()

        self.assertEqual(self.new_users(), 0)

    @override_settings(RIDE_ADMIN_IDIRS=['JSMITH', ' ', 'jsmith'])
    def test_creates_one_passwordless_admin_per_idir(self):
        self.grant()

        self.assertEqual(self.new_users(), 1)
        user = get_user_model().objects.get(username__startswith='idir__')
        self.assertEqual(user.username, 'idir__JSMITH')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertFalse(user.has_usable_password())

    @override_settings(RIDE_ADMIN_IDIRS=['jsmith'])
    def test_promotes_existing_idir_user(self):
        user = get_user_model().objects.create_user(username='idir__JSMITH')
        self.existing += 1

        output = self.grant()

        user.refresh_from_db()
        self.assertTrue(user.is_superuser)
        self.assertEqual(self.new_users(), 0)
        self.assertIn('Made admin: idir__JSMITH', output)

    @override_settings(RIDE_ADMIN_IDIRS=['JSMITH'])
    def test_promotes_user_signed_in_under_another_username(self):
        user = get_user_model().objects.create_user(username='abc123@azureidir')
        self.existing += 1
        SocialAccount.objects.create(user=user, provider='idir', uid='abc123',
                                     extra_data={'userinfo': {'idir_username': 'JSmith'}})

        self.grant()

        user.refresh_from_db()
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertEqual(self.new_users(), 0)

    @override_settings(RIDE_ADMIN_IDIRS=['JSMITH'])
    def test_ignores_bceid_account_with_same_name(self):
        bceid = get_user_model().objects.create_user(username='bceid__JSMITH')
        SocialAccount.objects.create(user=bceid, provider='bceid', uid='def456',
                                     extra_data={'userinfo': {'bceid_username': 'JSMITH'}})

        self.grant()

        bceid.refresh_from_db()
        self.assertFalse(bceid.is_superuser)
        self.assertTrue(get_user_model().objects.get(username='idir__JSMITH').is_superuser)

    @override_settings(RIDE_ADMIN_IDIRS=['JSMITH'])
    def test_rerun_keeps_one_user(self):
        self.grant()
        output = self.grant()

        self.assertEqual(self.new_users(), 1)
        self.assertIn('Already admin: idir__JSMITH', output)

    @override_settings(RIDE_ADMIN_IDIRS=['JSMITH', 'ABROWN'])
    def test_admins_join_the_users_organizations(self):
        user = get_user_model().objects.create_superuser(username='admin')
        admins = Command(stdout=StringIO(), stderr=StringIO()).grant_admins()
        command = Command(stdout=StringIO(), stderr=StringIO())

        organizations, _ = command.create_organizations(3, user, 2, admins + [user])

        joined = {entry['organization'] for entry in organizations
                  if user in entry['approvers']}
        self.assertEqual(len(joined), 2)
        self.assertEqual(set(user.organizations.all()), joined)
        for admin in admins:
            self.assertEqual(set(admin.organizations.all()), joined)
            for entry in organizations:
                self.assertEqual(admin in entry['approvers'], entry['organization'] in joined)
                self.assertNotIn(admin, entry['submitters'])
        # --user isn't added twice when it's also an admin
        for entry in organizations:
            self.assertLessEqual(entry['approvers'].count(user), 1)
