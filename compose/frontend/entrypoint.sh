#!/bin/sh
set -e

# This runs as an nginx entrypoint.d hook; it must not exec or exit non-zero on success.

# Source the vault secrets
. /vault/secrets/secrets.env

# Generate runtime env.js (consumed at runtime via window.__ENV__)
NGINX_ROOT="/usr/share/nginx/html"
mkdir -p "$NGINX_ROOT"
cat > "${NGINX_ROOT}/env.js" <<EOF
window.__ENV__ = {
  API_HOST: '${VITE_API_HOST}',
  GEOCODER_HOST: '${VITE_GEOCODER_HOST}',
  GEOCODER_CLIENT_ID: '${VITE_GEOCODER_CLIENT_ID}',
  ROUTER_CLIENT_ID: '${VITE_ROUTER_CLIENT_ID}',
  DEBUG: '${VITE_DEBUG}',
  BASE_MAP_URL: '${VITE_BASE_MAP_URL}',
  MAP_STYLE_URL: '${VITE_MAP_STYLE_URL}',
  DEPLOYMENT_TAG: '${DEPLOYMENT_TAG}',
  RELEASE: '${RELEASE}',
  BRANCH: '${BRANCH}',
  ALLOW_LOCAL_ACCOUNTS: '${VITE_ALLOW_LOCAL_ACCOUNTS}',
};
EOF

echo "Generated env.js with runtime configuration"

echo "Setting the Environment for connecting to the backend to '$ENVIRONMENT'"
sed -i "s~{ENVIRONMENT}~$ENVIRONMENT~g" /etc/nginx/conf.d/default.conf
