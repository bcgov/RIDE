#!/bin/bash

set -o errexit
set -o pipefail
set -o nounset

export RUNNING_HUEY=true
python manage.py run_huey
