from types import SimpleNamespace
from unittest.mock import patch
from django.core import mail
from django.test import SimpleTestCase, override_settings
from apps.cameras.email import notify_operations_new_password


def make_camera(**kwargs):
    defaults = {"id": 42, "admin_user": "admin42", "image_user": "img42"}
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


@override_settings(
    OPERATIONS_EMAIL_RECIPIENTS=["ops@drivebc.ca", "ops2@drivebc.ca"],
    DEFAULT_FROM_EMAIL="noreply@drivebc.ca",
)
class NotifyOperationsNewPasswordTests(SimpleTestCase):
    def test_admin_password_email(self):
        sent = notify_operations_new_password(
            make_camera(), "S3cret!pw", is_admin_password=True
        )

        self.assertEqual(sent, 1)
        self.assertEqual(len(mail.outbox), 1)
        message = mail.outbox[0]
        self.assertEqual(message.subject, "New camera admin password - Camera #42")
        self.assertEqual(message.from_email, "noreply@drivebc.ca")
        self.assertEqual(message.to, ["ops@drivebc.ca", "ops2@drivebc.ca"])
        self.assertIn("A new admin user password", message.body)
        self.assertIn("Camera ID: 42", message.body)
        self.assertIn("Admin user: admin42", message.body)
        self.assertIn("New password: S3cret!pw", message.body)

    def test_image_password_email_is_the_default(self):
        notify_operations_new_password(make_camera(), "pw123")

        message = mail.outbox[0]
        self.assertEqual(message.subject, "New camera image password - Camera #42")
        self.assertIn("A new image user password", message.body)
        self.assertIn("Image user: img42", message.body)
        self.assertNotIn("admin42", message.body)

    def test_image_email_does_not_leak_admin_username(self):
        notify_operations_new_password(make_camera(), "pw", is_admin_password=False)
        self.assertNotIn("admin42", mail.outbox[0].body)

    def test_admin_email_does_not_leak_image_username(self):
        notify_operations_new_password(make_camera(), "pw", is_admin_password=True)
        self.assertNotIn("img42", mail.outbox[0].body)

    @override_settings(OPERATIONS_EMAIL_RECIPIENTS=[])
    def test_empty_recipients_raises_and_sends_nothing(self):
        with self.assertRaisesMessage(ValueError, "not configured"):
            notify_operations_new_password(make_camera(), "pw")
        self.assertEqual(len(mail.outbox), 0)

    @override_settings(OPERATIONS_EMAIL_RECIPIENTS=None)
    def test_none_recipients_raises(self):
        with self.assertRaises(ValueError):
            notify_operations_new_password(make_camera(), "pw")

    def test_send_mail_is_called_with_fail_silently_false(self):
        with patch("apps.cameras.email.send_mail", return_value=1) as mock_send:
            result = notify_operations_new_password(make_camera(), "pw")

        self.assertEqual(result, 1)
        kwargs = mock_send.call_args.kwargs
        self.assertIs(kwargs["fail_silently"], False)
        self.assertEqual(kwargs["recipient_list"], ["ops@drivebc.ca", "ops2@drivebc.ca"])
        self.assertEqual(kwargs["from_email"], "noreply@drivebc.ca")

    def test_smtp_errors_propagate(self):
        """The view wraps this call in try/except, so errors must escape here."""
        with patch("apps.cameras.email.send_mail", side_effect=OSError("smtp down")):
            with self.assertRaises(OSError):
                notify_operations_new_password(make_camera(), "pw")