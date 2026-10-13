from cryptography.fernet import Fernet, InvalidToken, MultiFernet
from django.conf import settings
from django.db import models


def _fernet():
    # settings.FIELD_ENCRYPTION_KEYS: list of urlsafe-base64 Fernet keys,
    # newest first. Encrypts with the first key, decrypts with any.
    return MultiFernet([Fernet(k) for k in settings.FIELD_ENCRYPTION_KEYS])


class EncryptedTextField(models.TextField):
    """Stores values as Fernet ciphertext; returns plaintext in Python.

    Not filterable/searchable (ciphertext differs on every encryption).
    """

    def get_prep_value(self, value):
        value = super().get_prep_value(value)
        if not value:
            return value
        return _fernet().encrypt(value.encode()).decode()

    def from_db_value(self, value, expression, connection):
        if not value:
            return value
        try:
            return _fernet().decrypt(value.encode()).decode()
        except InvalidToken:
            # Legacy plaintext row, only expected until the data migration
            # has run everywhere. REMOVE this fallback afterwards so a
            # plaintext value can never silently pass through.
            return value
