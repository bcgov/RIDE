#!/bin/bash

# If the cluster is golddr, we always want to return 200 OK
if [ "$CLUSTER" = "golddr" ]; then
  caddy run --config /app/Caddyfile_200
else
  caddy run --config /app/Caddyfile_200 &
  bash /app/lbcheck.sh
fi