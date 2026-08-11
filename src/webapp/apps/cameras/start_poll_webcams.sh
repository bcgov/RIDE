
#!/bin/sh
set -eu

cd /app/webapp

while true; do
    echo "[$(date -Iseconds)] Starting webcam polling"

    if python manage.py poll_webcams; then
        echo "[$(date -Iseconds)] Webcam polling completed"
    else
        echo "[$(date -Iseconds)] ERROR: Webcam polling failed"
    fi

    sleep 60
done
