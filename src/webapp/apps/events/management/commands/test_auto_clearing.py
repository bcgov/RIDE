# import json
from datetime import datetime, timezone, timedelta
from pprint import pprint
from django.core.management.base import BaseCommand, CommandError
# from rest_framework.test import APIRequestFactory

from apps.events.models import Event
from apps.events.tasks import check_end_time
from apps.users.models import get_task_user


class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('-c', '--clear', action='store',
                            help='run the clear_end_time() task')
        parser.add_argument('-e', '--end', action='store',
                            help='set the end time for this event to now + 30sec')
        parser.add_argument('-r', '--revert', action='store',
                            help='revert the clearing of this event')

    def handle(self, *args, **options):

        if options['revert']:
            new_end_time = datetime.now(timezone.utc) + timedelta(days=30)
            Event.objects.filter(id=options['revert']).update(end_time=new_end_time)
            event = Event.objects.get(id=options['revert'], latest=True)
            prior = event.prior()
            Event.objects.filter(pk=prior.pk).update(latest=True, latest_approved=True)
            Event.objects.filter(pk=event.pk).delete();
        elif options['end']:
            new_end_time = datetime.now(timezone.utc) + timedelta(seconds=30)
            event = Event.current.filter(id=options['end']).update(end_time=new_end_time)
        elif options['clear']:
            check_end_time()
        else:
            print('no option chosen')
