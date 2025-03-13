#!/bin/bash

caddy run --config /app/Caddyfile_200 &
bash /app/lbcheck.sh
