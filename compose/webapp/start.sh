#!/bin/bash

set -o errexit
set -o pipefail
set -o nounset

echo 'migrating'
python manage.py migrate

echo 'collecting static files'
python manage.py collectstatic --noinput

echo 'migration done; creating superuser'
python manage.py createsuperuser \
    --noinput \
    --username $DJANGO_SUPERUSER_USERNAME \
    --email $DJANGO_SUPERUSER_EMAIL || true 2> /dev/null

echo 'creating superuser done; starting service'

env | grep hello # for testing VAULT
env | grep test # for testing VAULT

export DJANGO_SETTINGS_MODULE=config.settings
gunicorn -b 0.0.0.0 --reload config.wsgi 2> /tmp/gunicorn.log
