#!/bin/sh
set -e

# Source the vault secrets
. /vault/secrets/secrets.env

# Generate the env.js file with runtime values
cat > /app/app/env.js <<EOF
export const API_HOST = '${VITE_API_HOST}';
export const GEOCODER_HOST = '${VITE_GEOCODER_HOST}';
export const GEOCODER_CLIENT_ID = '${VITE_GEOCODER_CLIENT_ID}';
export const ROUTER_CLIENT_ID = '${VITE_ROUTER_CLIENT_ID}';
export const DEBUG = '${DEBUG}';
export const BASE_MAP_URL = '${VITE_BASE_MAP_URL}';
export const MAP_STYLE_URL = '${VITE_MAP_STYLE_URL}';
EOF

echo "Generated env.js with runtime configuration"

# Start the dev server
cd /app && exec npm run dev