from django.apps import AppConfig
import os
import threading
import time
from django.core.management import call_command


class CamerasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.cameras'
