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
RIDE_ORGS_STRING = env('RIDE_ORGS_STRING', default="")

# IDIRs that seed_data makes superusers, for PR previews and local testing.
# Leave unset everywhere else.
RIDE_ADMIN_IDIRS = env.list('RIDE_ADMIN_IDIRS', default=[])

EVENT_PREFIX = env('EVENT_PREFIX', default='RIDE')

RIDE_FROM_EMAIL_DEFAULT = env('RIDE_FROM_EMAIL_DEFAULT', default='DoNotReply_RIDE@gov.bc.ca')
ACCESS_REQUEST_RECEIVERS = env('ACCESS_REQUEST_RECEIVERS', default='ride.support@gov.bc.ca').split(';')

# DBC22-7326: event notification emails (mirrors DBC DRIVEBC_FROM_EMAIL_*)
RIDE_NOTIFICATION_FROM_EMAIL_DEFAULT = env('RIDE_NOTIFICATION_FROM_EMAIL_DEFAULT', default='DoNotReply_RIDE@gov.bc.ca')
RIDE_NOTIFICATION_FROM_EMAIL_SENDER = f'DriveBC RIDE <{RIDE_NOTIFICATION_FROM_EMAIL_DEFAULT}>'
RIDE_NOTIFICATION_ADDRESS_BOOK_EMAIL = env('RIDE_NOTIFICATION_ADDRESS_BOOK_EMAIL',
                                           default=RIDE_NOTIFICATION_FROM_EMAIL_DEFAULT)
RIDE_NOTIFICATION_SUBJECT_PREFIX = env('RIDE_NOTIFICATION_SUBJECT_PREFIX', default='')  # e.g. '[DEV] '
RIDE_SUPPORT_EMAIL = env('RIDE_SUPPORT_EMAIL', default='ride.support@gov.bc.ca')

# Public DriveBC site for "View on DriveBC" links; omitted from emails when empty
DRIVEBC_BASE_URL = env('DRIVEBC_BASE_URL', default='')
