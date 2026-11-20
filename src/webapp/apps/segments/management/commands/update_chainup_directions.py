from django.core.management.base import BaseCommand

from apps.segments.enums import Direction
from apps.segments.models import ChainUp


def update_chainup_directions():
    # queryset update skips save()
    for direction in Direction:
        ChainUp.objects.filter(name__icontains=direction.label).update(direction=direction)


class Command(BaseCommand):
    help = 'Set chainup direction parsed from chainup name'

    def handle(self, *args, **options):
        update_chainup_directions()
