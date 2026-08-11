import logging
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models

from ..shared.models import BaseModel

log = logging.getLogger()


class RIDEUser(AbstractUser):
    organizations = models.ManyToManyField('organizations.Organization', related_name='users', blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    class Meta:
        permissions = [
            ('approve_ride_events', 'Can approve RIDE events'),
            ('access_camera_page', 'Can access camera page'),
            ('administer_cameras', 'Can manage cameras'),
        ]

    @property
    def is_approver(self) -> bool:
        return self.has_perm('users.approve_ride_events')

    @property
    def is_camera_role(self) -> bool:
        return self.has_perm('users.access_camera_page')

    @property
    def is_camera_admin(self) -> bool:
        return self.has_perm('users.administer_cameras')



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
