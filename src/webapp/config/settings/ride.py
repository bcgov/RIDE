from pathlib import Path
import environ

# Base dir and env
BASE_DIR = Path(__file__).resolve().parents[4]
SRC_DIR = Path(__file__).resolve().parents[3]
APP_DIR = Path(__file__).resolve().parents[2]
env = environ.Env()
environ.Env.read_env(BASE_DIR / '.env', overwrite=True)

KEYCLOAK_URL = env('KEYCLOAK_URL')
KEYCLOAK_CLIENT_ID = env('KEYCLOAK_CLIENT_ID')
KEYCLOAK_SECRET = env('KEYCLOAK_SECRET')

ALLOW_LOCAL_ACCOUNTS = env.bool('ALLOW_LOCAL_ACCOUNTS', default=False)

if env('ENABLE_DEBUG_LOGGING', default=False):
    LOGGING = {
        'version': 1,
        'disable_existing_loggers': False,
        'handlers': {
            'file': {
                'level': 'DEBUG',
                'class': 'logging.FileHandler',
                'filename': './debug.log',
                'formatter': 'simple',
                'mode': 'w'
            },
        },
        'formatters': {
            'simple': {
                'format': '{asctime} [{levelname}] {message}',
                'style': '{',
                'datefmt' : '%H:%M:%S'
            },
        },
        'loggers': {
            'debug': {
                'handlers': ['file'],
                'level': 'DEBUG',
                'propagate': False,
            },
        },
    }

RIDE_USERS_STRING = env('RIDE_USERS_STRING', default="")
