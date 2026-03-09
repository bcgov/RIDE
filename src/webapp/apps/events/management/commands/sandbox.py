import logging
import time

from django.core.management.base import BaseCommand

from apps.events.models import Event

logger = logging.getLogger(__name__)

def timed(method):
    def inner(*args, **kw):
        ts = time.time()
        method(*args, **kw)
        te = time.time()

        print(f'{method.__name__!r}  {(te - ts) * 1000:2.2f} ms')

    return inner

@timed
def sandbox_function():
    event = Event.current.filter(id='RIDE-100009').first()


class Command(BaseCommand):
    def handle(self, *args, **options):
        sandbox_function()
