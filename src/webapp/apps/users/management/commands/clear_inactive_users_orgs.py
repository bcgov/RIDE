from django.core.management.base import BaseCommand

from apps.users.models import RIDEUser


class Command(BaseCommand):
    help = 'Remove organization assignments from all inactive (is_active=False) users.'

    def handle(self, *args, **options):
        for user in RIDEUser.objects.filter(is_active=False):
            user.organizations.clear()
