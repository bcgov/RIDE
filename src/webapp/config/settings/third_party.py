import os
from pathlib import Path

import environ

# Base dir and env
BASE_DIR = Path(__file__).resolve().parents[4]
SRC_DIR = Path(__file__).resolve().parents[3]
APP_DIR = Path(__file__).resolve().parents[2]
env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env', overwrite=True)

# Allauth
KEYCLOAK_CLIENT_ID = env('KEYCLOAK_CLIENT_ID')
KEYCLOAK_SECRET = env('KEYCLOAK_SECRET')
KEYCLOAK_URL = env('KEYCLOAK_URL')

ACCOUNT_EMAIL_VERIFICATION = 'none'
SOCIALACCOUNT_LOGIN_ON_GET = False
SOCIALACCOUNT_EMAIL_VERIFICATION = False
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
SOCIALACCOUNT_STORE_TOKENS = True

# need our own adapter to override various redirect url methods following
# login or logout
SOCIALACCOUNT_ADAPTER = 'config.adapter.RideSocialAdapter'
ACCOUNT_ADAPTER = 'config.adapter.RideAdapter'

SOCIALACCOUNT_PROVIDERS = {
    'openid_connect': {
        'APPS': [
            {
                'provider_id': 'bceid',
                'name': 'BCeID via Keycloak',
                'client_id': KEYCLOAK_CLIENT_ID,
                'secret': KEYCLOAK_SECRET,
                'settings': {
                    'server_url': KEYCLOAK_URL,
                    'auth_params': {
                        'kc_idp_hint': 'bceidboth',
                    },
                },
            },
            {
                'provider_id': 'idir',
                'name': 'Azure IDIR via Keycloak',
                'client_id': KEYCLOAK_CLIENT_ID,
                'secret': KEYCLOAK_SECRET,
                'settings': {
                    'server_url': KEYCLOAK_URL,
                    'auth_params': {
                        'kc_idp_hint': 'azureidir',
                    },
                },
            },
        ],
        'EMAIL_AUTHENTICATION_AUTO_CONNECT': True,
        'EMAIL_AUTHENTICATION': True,
        'STORE_TOKENS': True,
    },
}

# On windows, GDAL and GEOS require explicit paths to the dlls
if os.name == 'nt':
    GEOS_LIBRARY_PATH = env('GEOS_LIBRARY_PATH')
    GDAL_LIBRARY_PATH = env('GDAL_LIBRARY_PATH')
    PROJ_LIB = env('PROJ_LIB')


# Django Rest Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
    ]
}

ROUTE_PLANNER_API_URL = env('ROUTE_PLANNER_API_URL', default='')
ROUTE_PLANNER_API_KEY = env('ROUTE_PLANNER_API_KEY', default='')
