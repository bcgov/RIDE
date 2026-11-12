#!/bin/sh
set -e

. /vault/secrets/secrets.env

SHARED_CONFIG="${SHARED_VOLUME_PATH:-/shared-config}"
STATIC_ASSETS="/usr/share/caddy/html"
CADDYFILE_SOURCE="/etc/caddy/Caddyfile"
CSP_NONCE=$(head -c 18 /dev/urandom | base64)

mkdir -p "$SHARED_CONFIG"
echo "Copying ${STATIC_ASSETS} to ${SHARED_CONFIG}..."
cp -R "${STATIC_ASSETS}/." "$SHARED_CONFIG/"

cat > "${SHARED_CONFIG}/config_snippet.html" <<EOF
<script>
window.__ENV__ = {
  API_HOST: '${VITE_API_HOST}',
  GEOCODER_HOST: '${VITE_GEOCODER_HOST}',
  GEOCODER_CLIENT_ID: '${VITE_GEOCODER_CLIENT_ID}',
  ROUTER_CLIENT_ID: '${VITE_ROUTER_CLIENT_ID}',
  ROUTER_URL: '${VITE_ROUTER_URL}',
  ROUTABLE_LOCATIONS_HOST: '${VITE_ROUTABLE_LOCATIONS_HOST}',
  DEBUG: '${VITE_DEBUG}',
  BASE_MAP_URL: '${VITE_BASE_MAP_URL}',
  MAP_STYLE_URL: '${VITE_MAP_STYLE_URL}',
  DEPLOYMENT_TAG: '${DEPLOYMENT_TAG}',
  RELEASE: '${RELEASE}',
  BRANCH: '${BRANCH}',
  ALLOW_LOCAL_ACCOUNTS: '${VITE_ALLOW_LOCAL_ACCOUNTS}',
  DMS_API_URL: '${VITE_DMS_API_URL}',
  SHOW_DEBUG_CONTROL: '${SHOW_DEBUG_CONTROL}',
  ENVIRONMENT: '${ENVIRONMENT}',
};
</script>
EOF

CONFIG_ONE_LINE=$(tr -d '\n' < "${SHARED_CONFIG}/config_snippet.html")
TARGET_INDEX="${SHARED_CONFIG}/index.html"

echo "Injecting runtime config into ${TARGET_INDEX}..."
sed -i "s~<head>~<head>${CONFIG_ONE_LINE}~" "$TARGET_INDEX"

echo "Adding CSP nonce to inline scripts in ${TARGET_INDEX}..."
sed -i "s~<script~<script nonce=\"${CSP_NONCE}\"~g" "$TARGET_INDEX"

echo "Re-compressing index.html for gzip, Brotli, and Zstandard..."
gzip -9 -kf "$TARGET_INDEX"
brotli -q 11 -kf "$TARGET_INDEX"
zstd -19 -fk "$TARGET_INDEX"
rm "${SHARED_CONFIG}/config_snippet.html"

echo "Preparing Caddyfile..."
cp "$CADDYFILE_SOURCE" "${SHARED_CONFIG}/Caddyfile"
sed -i "s~{CSP_NONCE}~${CSP_NONCE}~g" "${SHARED_CONFIG}/Caddyfile"

echo "Done. Files in ${SHARED_CONFIG}:"
ls -lh "$SHARED_CONFIG"
