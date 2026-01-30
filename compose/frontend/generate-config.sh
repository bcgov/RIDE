#!/bin/sh
set -e

# This runs as an init container; outputs to shared volume for main container

# Source the vault secrets
. /vault/secrets/secrets.env

# Generate runtime env.js in shared volume (consumed at runtime via window.__ENV__)
SHARED_CONFIG="/shared-config"
mkdir -p "$SHARED_CONFIG"

cat > "${SHARED_CONFIG}/env.js" <<EOF
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

# Gzip the env.js file for nginx to serve compressed version
gzip -9 -c "${SHARED_CONFIG}/env.js" > "${SHARED_CONFIG}/env.js.gz"
echo "Created gzipped version: env.js.gz"

# Copy the default nginx config from the container image to shared volume
cp /etc/nginx/conf.d/default.conf "${SHARED_CONFIG}/default.conf"

# --- Handle Debug Route ---
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "Environment is 'dev'; Enabling __debug__ route."
    # This changes the prefix match to a regex match including __debug__
    sed -i 's|location \^~ /admin {|location ~ ^/(admin\|__debug__) {|' "${SHARED_CONFIG}/default.conf"
else
    echo "Environment is not 'dev'; not adding the debug toolbar route."
fi

# Update the environment placeholder in the copied config
echo "Setting the Environment for connecting to the backend to '$ENVIRONMENT'"
sed -i "s~{ENVIRONMENT}~$ENVIRONMENT~g" "${SHARED_CONFIG}/default.conf"

echo "Configuration files ready in ${SHARED_CONFIG}:"
ls -la "${SHARED_CONFIG}/"