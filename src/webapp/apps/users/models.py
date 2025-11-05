from django.contrib.auth.models import AbstractUser
from django.db import models


class RIDEUser(AbstractUser):
    organizations = models.ManyToManyField('organizations.Organization', related_name='users', blank=True)

    @property
    def is_approver(self) -> bool:
        return self.has_perm('users.approve_ride_events')
