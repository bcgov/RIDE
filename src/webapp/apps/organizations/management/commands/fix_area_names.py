from django.core.management.base import BaseCommand

from apps.organizations.models import ServiceArea


class Command(BaseCommand):
    help = 'Fix area names that do not match Open511'

    def handle(self, *args, **options):
        ServiceArea.objects.filter(name='Bulkley-Stikine').update(name='Bulkley Stikine')
