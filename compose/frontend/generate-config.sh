#!/bin/sh
set -e

# Source secrets
. /vault/secrets/secrets.env

SHARED_CONFIG="/shared-config"

# 1. COPY ALL FILES TO SHARED VOLUME
# We copy the entire html root (index.html, assets/, etc) to the shared folder
echo "Copying /usr/share/nginx/html/ to ${SHARED_CONFIG}..."
cp -r /usr/share/nginx/html/* "${SHARED_CONFIG}/"

# 2. PREPARE THE CONFIG BLOCK
# We create a temporary file with the script tag to ensure clean formatting
cat > "${SHARED_CONFIG}/config_snippet.html" <<EOF
<script>
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
</script>
EOF

# 3. INJECT INTO INDEX.HTML
# We remove newlines from the snippet to make it safe for 'sed' insertion
CONFIG_ONE_LINE=$(tr -d '\n' < "${SHARED_CONFIG}/config_snippet.html")
TARGET_INDEX="${SHARED_CONFIG}/index.html"

echo "Injecting runtime config into ${TARGET_INDEX}..."
# We search for <head> and replace it with <head><script>...</script>
sed -i "s~<head>~<head>${CONFIG_ONE_LINE}~" "$TARGET_INDEX"

# 4. RE-COMPRESS INDEX.HTML
# The old index.html.gz is now stale because we modified the html.
echo "Re-compressing index.html..."
rm "${TARGET_INDEX}.gz"
gzip -9 -k "$TARGET_INDEX"

# Cleanup temp file
rm "${SHARED_CONFIG}/config_snippet.html"

# ----------------------------------------------------------------
# NGINX CONFIG SETUP
# ----------------------------------------------------------------

cp /etc/nginx/conf.d/default.conf "${SHARED_CONFIG}/default.conf"
echo "Setting the Environment for connecting to the backend to '$ENVIRONMENT'"
sed -i "s~{ENVIRONMENT}~$ENVIRONMENT~g" "${SHARED_CONFIG}/default.conf"

echo "Done. Files in ${SHARED_CONFIG}:"
ls -lh "${SHARED_CONFIG}"