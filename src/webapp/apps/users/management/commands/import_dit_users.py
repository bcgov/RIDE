from django.core.management.base import BaseCommand

from apps.organizations.models import Organization, ServiceArea
from apps.users.models import RIDEUser
from config.settings import RIDE_USERS_STRING, RIDE_ORGS_STRING


def parse_users_string():
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

def parse_orgs_string():
    orgs_string = RIDE_ORGS_STRING
    orgs_rows = orgs_string.strip().split('|')
    for org_column in orgs_rows:
        if not org_column:
            continue

        org_data = org_column.split(',')
        org_name = org_data[0]
        area_name = org_data[1]

        org = Organization.objects.filter(name=org_name).first()
        area = ServiceArea.objects.filter(name=area_name).first()
        if org and area:
            org.service_areas.add(area)


class Command(BaseCommand):
    def handle(self, *args, **options):
        parse_users_string()
        parse_orgs_string()
