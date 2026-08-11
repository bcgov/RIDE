from django.conf import settings
from django.core.mail import send_mail


def notify_operations_new_password(camera, password, is_admin_password=False):
    recipients = settings.OPERATIONS_EMAIL_RECIPIENTS

    if not recipients:
        raise ValueError('Operations email recipients are not configured.')

    if is_admin_password:
        subject = f'New camera admin password - Camera #{camera.id}'
        username = camera.admin_user
        user_type = 'admin'
    else:
        subject = f'New camera image password - Camera #{camera.id}'
        username = camera.image_user
        user_type = 'image'

    message = f"""
A new {user_type} user password has been generated for a camera.

Camera ID: {camera.id}
{user_type.capitalize()} user: {username}
New password: {password}

Please update the corresponding connection credentials
where required.
"""

    return send_mail(
        subject=subject,
        message=message,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=recipients,
        fail_silently=False,
    )