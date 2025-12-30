from django.contrib.auth.models import AbstractUser
from django.db import models


class RIDEUser(AbstractUser):
    organizations = models.ManyToManyField('organizations.Organization', related_name='users', blank=True)
    phone_number = models.CharField(max_length=20, blank=True, null=True)

    @property
    def is_approver(self) -> bool:
        return self.has_perm('users.approve_ride_events')
