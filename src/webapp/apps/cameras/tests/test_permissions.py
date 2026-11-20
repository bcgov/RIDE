from django.test import RequestFactory, SimpleTestCase, override_settings
from apps.cameras.permissions import HasServiceToken


class HasServiceTokenTests(SimpleTestCase):
    def setUp(self):
        self.rf = RequestFactory()
        self.permission = HasServiceToken()

    def check(self, token=None):
        extra = {"HTTP_X_INTERNAL_TOKEN": token} if token is not None else {}
        request = self.rf.get("/", **extra)
        return self.permission.has_permission(request, view=None)

    @override_settings(INTERNAL_API_TOKEN="s3cret-token")
    def test_correct_token_is_allowed(self):
        self.assertTrue(self.check("s3cret-token"))

    @override_settings(INTERNAL_API_TOKEN="s3cret-token")
    def test_wrong_token_is_denied(self):
        self.assertFalse(self.check("wrong"))

    @override_settings(INTERNAL_API_TOKEN="s3cret-token")
    def test_token_is_case_sensitive(self):
        self.assertFalse(self.check("S3CRET-TOKEN"))

    @override_settings(INTERNAL_API_TOKEN="s3cret-token")
    def test_prefix_of_token_is_denied(self):
        self.assertFalse(self.check("s3cret"))

    @override_settings(INTERNAL_API_TOKEN="s3cret-token")
    def test_missing_header_is_denied(self):
        self.assertFalse(self.check())

    @override_settings(INTERNAL_API_TOKEN="s3cret-token")
    def test_empty_header_is_denied(self):
        self.assertFalse(self.check(""))

    @override_settings(INTERNAL_API_TOKEN="")
    def test_unconfigured_token_denies_even_an_empty_header(self):
        """An empty expected token must never match an empty/missing header."""
        self.assertFalse(self.check(""))
        self.assertFalse(self.check())

    @override_settings(INTERNAL_API_TOKEN=None)
    def test_none_token_is_denied(self):
        # getattr returns None here, so bool(expected) short-circuits
        self.assertFalse(self.check("anything"))

    def test_setting_absent_is_denied(self):
        from django.conf import settings
        with override_settings():
            del settings.INTERNAL_API_TOKEN
            self.assertFalse(self.check("anything"))

    def test_header_name_is_x_internal_token(self):
        with override_settings(INTERNAL_API_TOKEN="tok"):
            request = self.rf.get("/", HTTP_AUTHORIZATION="tok")
            self.assertFalse(self.permission.has_permission(request, None))


class HasServiceTokenKnownIssueTests(SimpleTestCase):
    @override_settings(INTERNAL_API_TOKEN="s3cret-token")
    def test_non_ascii_header_raises_type_error(self):
        """Known issue: hmac.compare_digest() rejects non-ASCII str, so a
        header like 'é' causes a 500 instead of a clean denial. Fix by
        comparing bytes: hmac.compare_digest(provided.encode(), expected.encode()).
        When fixed, change this to assertFalse(...)."""
        request = RequestFactory().get("/", HTTP_X_INTERNAL_TOKEN="é")
        with self.assertRaises(TypeError):
            HasServiceToken().has_permission(request, None)