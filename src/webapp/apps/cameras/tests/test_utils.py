import string
from unittest.mock import patch
from django.test import SimpleTestCase
from apps.cameras.utils import generate_secure_password

SYMBOLS = "!@#$%^&*()-_=+"
ALLOWED = set(string.ascii_letters + string.digits + SYMBOLS)


class GenerateSecurePasswordTests(SimpleTestCase):
    def test_default_length_is_16(self):
        self.assertEqual(len(generate_secure_password()), 16)

    def test_custom_lengths(self):
        for length in (3, 4, 8, 32, 128):
            with self.subTest(length=length):
                self.assertEqual(len(generate_secure_password(length)), length)

    def test_only_allowed_characters(self):
        for _ in range(200):
            self.assertLessEqual(set(generate_secure_password()), ALLOWED)

    def test_contains_each_category(self):
        for _ in range(500):
            pw = generate_secure_password()
            self.assertTrue(any(c in string.ascii_letters for c in pw), pw)
            self.assertTrue(any(c in string.digits for c in pw), pw)
            self.assertTrue(any(c in SYMBOLS for c in pw), pw)

    def test_minimum_length_still_has_each_category(self):
        for _ in range(200):
            pw = generate_secure_password(3)
            self.assertEqual(len(pw), 3)
            self.assertTrue(any(c in string.ascii_letters for c in pw))
            self.assertTrue(any(c in string.digits for c in pw))
            self.assertTrue(any(c in SYMBOLS for c in pw))

    def test_too_short_raises(self):
        for length in (2, 1, 0, -5):
            with self.subTest(length=length):
                with self.assertRaisesMessage(ValueError, "at least 3"):
                    generate_secure_password(length)

    def test_passwords_are_not_repeated(self):
        samples = {generate_secure_password() for _ in range(200)}
        self.assertEqual(len(samples), 200)

    def test_guaranteed_characters_are_shuffled(self):
        """Without the shuffle the first char would always be a letter."""
        first_chars = {generate_secure_password()[0] for _ in range(300)}
        self.assertTrue(
            any(c in string.digits or c in SYMBOLS for c in first_chars)
        )

    def test_uses_secrets_module_not_random(self):
        with patch("apps.cameras.utils.secrets.choice", wraps=__import__("secrets").choice) as choice:
            generate_secure_password(16)
        self.assertEqual(choice.call_count, 16)

    def test_returns_str(self):
        self.assertIsInstance(generate_secure_password(), str)