from pathlib import Path
import environ

# Base dir and env
BASE_DIR = Path(__file__).resolve().parents[4]
SRC_DIR = Path(__file__).resolve().parents[3]
APP_DIR = Path(__file__).resolve().parents[2]
env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env', overwrite=True)

SOCIALACCOUNT_EMAIL_VERIFICATION = False

SOCIALACCOUNT_PROVIDERS = {
    'openid_connect': {
        'APPS': [
            {
                'provider_id': 'idir',
                'name': 'Azure IDIR via Keycloak',
                'client_id': env("KEYCLOAK_CLIENT_ID"),
                'secret': env("KEYCLOAK_SECRET"),
                'settings': {
                    'server_url': env("KEYCLOAK_URL"),
                },
            },
        ],
        'AUTH_PARAMS': {
            'kc_idp_hint': 'azureidir',
        },
    },
}
