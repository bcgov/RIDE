from django.contrib.auth.models import AbstractUser


class RIDEUser(AbstractUser):
    @property
    def is_approver(self) -> bool:
        return self.has_perm('users.approve_ride_events')
