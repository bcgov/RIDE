from datetime import datetime, timedelta, timezone

from huey import crontab
from huey.contrib.djhuey import db_periodic_task, lock_task, on_startup, post_execute

from ..users.models import get_task_user
from .models import Event


@db_periodic_task(crontab(minute="*"))
@lock_task('check-end-time')
def check_end_time():
    '''
    Find current events with an end time earlier than now + one minute, and
    clear them.

    To accommodate lag in the time that clearing shows up on the browser, we
    query for one minute into the future (i.e., the same time as the period of
    the task being run) so that events show as cleared possibly several seconds
    before end_time, rather than afterwards.

    See DBC22-5632 for design rationale.
    '''

    cutoff = datetime.now(timezone.utc) + timedelta(minutes=1)
    user = get_task_user()

    for event in Event.current.filter(end_time__lte=cutoff, status='Active'):
        event.status = 'Inactive'
        event.user = user
        event.last_inactivated = event.end_time
        event.save()
