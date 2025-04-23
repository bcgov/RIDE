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
