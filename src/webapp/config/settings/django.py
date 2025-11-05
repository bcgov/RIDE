import os
from pathlib import Path
import environ

from corsheaders.defaults import default_headers

# Base dir and env
BASE_DIR = Path(__file__).resolve().parents[4]
SRC_DIR = Path(__file__).resolve().parents[3]
APP_DIR = Path(__file__).resolve().parents[2]
env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env', overwrite=True)

SECRET_KEY = env('SECRET_KEY')
DEBUG = env('DEBUG') == 'True'

ALLOWED_HOSTS = []

# Paths and urls
APPEND_SLASH = False
ROOT_URLCONF = 'config.urls'
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(SRC_DIR, 'static')
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(SRC_DIR, 'media')
FRONTEND_BASE_URL = env('FRONTEND_BASE_URL', default='http://localhost:5173/')

# Security
ALLOWED_HOSTS = env.list('DJANGO_ALLOWED_HOSTS')
CORS_ORIGIN_WHITELIST = env.list('DJANGO_CORS_ORIGIN_WHITELIST')
CSRF_TRUSTED_ORIGINS = env.list('DJANGO_CORS_ORIGIN_WHITELIST')
CORS_ALLOW_HEADERS = default_headers + ('contenttype',)
CORS_ALLOW_CREDENTIALS = True
CSRF_COOKIE_SECURE = env.bool('DJANGO_CSRF_COOKIE_SECURE')
SECURE_SSL_REDIRECT = env.bool('DJANGO_SECURE_SSL_REDIRECT')
SESSION_COOKIE_SECURE = env.bool('DJANGO_SESSION_COOKIE_SECURE')
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

LOGIN_REDIRECT_URL = FRONTEND_BASE_URL
LOGIN_URL = FRONTEND_BASE_URL

AUTHENTICATION_BACKENDS = [
    # Needed to login by username in Django admin, regardless of `allauth`
    'django.contrib.auth.backends.ModelBackend',

    # `allauth` specific authentication methods, such as login by email
    'allauth.account.auth_backends.AuthenticationBackend',
]

# Application definition

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.gis',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    "allauth",
    "allauth.account",
    'allauth.socialaccount',
    "allauth.socialaccount.providers.openid_connect",
    "allauth.usersessions",

    'rest_framework',
    'rest_framework_gis',

    'debug_toolbar',

    'apps.ride',
    'apps.events',
    'apps.users',
    'apps.organizations',

    'django.contrib.admin',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    "corsheaders.middleware.CorsMiddleware",
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'debug_toolbar.middleware.DebugToolbarMiddleware',
    'allauth.account.middleware.AccountMiddleware',
    'django.contrib.auth.middleware.LoginRequiredMiddleware',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [APP_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'


DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': env('DB_NAME'),
        'USER': env('DB_USER'),
        'PASSWORD': env('DB_PASSWORD'),
        'HOST': env('DB_HOST'),
        'PORT': env.int('DB_PORT'),
    }
}


LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'
USE_I18N = False
USE_TZ = True


DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# Django Debug Toolbar settings
INTERNAL_IPS = [
    '127.0.0.1',
]

SHOW_DEBUG_TOOLBAR = env('SHOW_DEBUG_TOOLBAR', default=False)
DEBUG_TOOLBAR_CONFIG = {
    'SHOW_TOOLBAR_CALLBACK': lambda request: SHOW_DEBUG_TOOLBAR,
}

# Auth
AUTH_USER_MODEL = "users.RIDEUser"
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": f"django.contrib.auth.password_validation.{name}"}
    for name in [
        "UserAttributeSimilarityValidator",
        "MinimumLengthValidator",
        "CommonPasswordValidator",
        "NumericPasswordValidator",
    ]
]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",

    # `allauth` specific authentication methods, such as login by email
    'allauth.account.auth_backends.AuthenticationBackend',
]

LOGIN_REDIRECT_URL = FRONTEND_BASE_URL
IDIR_LOGIN_PATH = 'accounts/oidc/idir/login/?process=login&next=%2Fdrivebc-admin%2F&auth_params=kc_idp_hint=azureidir'
LOGIN_URL = (('http://localhost:8000/' if 'localhost' in FRONTEND_BASE_URL else FRONTEND_BASE_URL) + IDIR_LOGIN_PATH)
