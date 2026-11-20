import logging
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from ..shared.models import BaseModel

log = logging.getLogger()


class RIDEUser(AbstractUser):
    organizations = models.ManyToManyField('organizations.Organization', related_name='users', blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    @property
    def is_approver(self) -> bool:
        return self.has_perm('users.approve_ride_events')


def get_task_user():
    ''' Return the user for task operations '''

    try:
        return RIDEUser.objects.get(username='taskuser')
    except RIDEUser.DoesNotExist as e:
        log.error("Task user does not exist; check migrations in users")
        raise e


class Request(BaseModel):

    class RequestTypes(models.TextChoices):
        ADD_TO_ORG = 'ADD_TO_ORGANIZATION', 'Add user to organization'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey(RIDEUser, on_delete=models.CASCADE)
    request_type = models.CharField(choices=RequestTypes, default=RequestTypes.ADD_TO_ORG)
    details = models.JSONField(default=dict)


class EmailSubscription(BaseModel):
    '''
    DBC22-7326: a user's RIDE email notification settings.

    Mirrors DBC's authentication.EmailSubscription (notification flag plus
    JSON lists of codes), but RIDE has one subscription per user covering
    several service areas rather than one per area.  Codes are defined in
    apps.events.enums (NotificationEventType, NotificationSeverity,
    NotificationStatus and NotificationCreator).
    '''

    user = models.OneToOneField(RIDEUser, on_delete=models.CASCADE,
                                related_name='email_subscription')

    notification = models.BooleanField(default=False, blank=True)  # Whether to notify user at all
    notification_areas = models.ManyToManyField('organizations.ServiceArea', blank=True,
                                                related_name='email_subscriptions')
    notification_types = models.JSONField(default=list, blank=True)  # list of event type codes
    notification_severities = models.JSONField(default=list, blank=True)  # list of severity codes
    notification_statuses = models.JSONField(default=list, blank=True)  # list of status codes
    notification_creator = models.CharField(max_length=20, default='all', blank=True)

    def __str__(self):
        return f'{self.user} notifications {"on" if self.notification else "off"}'
