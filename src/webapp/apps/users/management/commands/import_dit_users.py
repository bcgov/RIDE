from django.core.management.base import BaseCommand

from apps.organizations.models import Organization
from apps.users.models import RIDEUser
from config.settings import RIDE_USERS_STRING


class Command(BaseCommand):
    def handle(self, *args, **options):
        users_string = RIDE_USERS_STRING
        users_rows = users_string.strip().split('|')
        for user_column in users_rows:
            if not user_column:
                continue

            user = user_column.split(',')
            organization_name = user[0]
            name = user[1]
            username = user[2]
            email = user[3]
            phone = user[4]

            org = Organization.objects.get_or_create(name=organization_name)[0]
            user = RIDEUser.objects.get_or_create(username=username)[0]
            user.first_name = name.split(' ')[0]
            user.last_name = ' '.join(name.split(' ')[1:])
            user.email = email
            user.phone_number = phone
            user.organizations.add(org)
            user.save()

