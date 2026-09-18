#!/bin/sh
set -e

. /vault/secrets/secrets.env

SHARED_CONFIG="/shared-config"

CSP_NONCE=$(head -c 18 /dev/urandom | base64)

echo "Copying /usr/share/nginx/html/ to ${SHARED_CONFIG}..."
cp -r /usr/share/nginx/html/* "${SHARED_CONFIG}/"

cat > "${SHARED_CONFIG}/config_snippet.html" <<EOF
<script>
window.__ENV__ = {
  API_HOST: '${VITE_API_HOST}',
  GEOCODER_HOST: '${VITE_GEOCODER_HOST}',
  GEOCODER_CLIENT_ID: '${VITE_GEOCODER_CLIENT_ID}',
  ROUTER_CLIENT_ID: '${VITE_ROUTER_CLIENT_ID}',
  ROUTER_URL: '${VITE_ROUTER_URL}',
  DEBUG: '${VITE_DEBUG}',
  BASE_MAP_URL: '${VITE_BASE_MAP_URL}',
  MAP_STYLE_URL: '${VITE_MAP_STYLE_URL}',
  DEPLOYMENT_TAG: '${DEPLOYMENT_TAG}',
  RELEASE: '${RELEASE}',
  BRANCH: '${BRANCH}',
  ALLOW_LOCAL_ACCOUNTS: '${VITE_ALLOW_LOCAL_ACCOUNTS}',
  DMS_API_URL: '${VITE_DMS_API_URL}',
  SHOW_DEBUG_CONTROL: '${SHOW_DEBUG_CONTROL}',
};
</script>
EOF

CONFIG_ONE_LINE=$(tr -d '\n' < "${SHARED_CONFIG}/config_snippet.html")
TARGET_INDEX="${SHARED_CONFIG}/index.html"

echo "Injecting runtime config into ${TARGET_INDEX}..."
sed -i "s~<head>~<head>${CONFIG_ONE_LINE}~" "$TARGET_INDEX"

echo "Adding CSP nonce to all inline scripts in ${TARGET_INDEX}..."
sed -i "s~<script~<script nonce=\"${CSP_NONCE}\"~g" "$TARGET_INDEX"

echo "Re-compressing index.html..."
rm "${TARGET_INDEX}.gz"
gzip -9 -k "$TARGET_INDEX"

rm "${SHARED_CONFIG}/config_snippet.html"

cp /etc/nginx/conf.d/default.conf "${SHARED_CONFIG}/default.conf"
cp /etc/nginx/conf.d/security_headers.conf "${SHARED_CONFIG}/security_headers.conf"

# --- Handle Debug Route ---
if [ "$SHOW_DEBUG_TOOLBAR" = "True" ]; then
    echo "Debug toolbar is enabled; Enabling __debug__ route."
    # This changes the prefix match to a regex match including __debug__
    sed -i 's|location \^~ /admin {|location ~ ^/(admin\|__debug__) {|' "${SHARED_CONFIG}/default.conf"
else
    echo "Debug toolbar is not enabled; not adding the debug toolbar route."
fi

# Update the environment placeholder in the copied config
echo "Setting the Environment for connecting to the backend to '$ENVIRONMENT'"
sed -i "s~{ENVIRONMENT}~$ENVIRONMENT~g" "${SHARED_CONFIG}/default.conf"

echo "Setting the DMS Proxy URL for connecting nginx to '${DMS_PROXY_URL}'"
sed -i "s~{DMS_PROXY_URL}~${DMS_PROXY_URL}~g" "${SHARED_CONFIG}/default.conf"

echo "Setting CSP nonce"
sed -i "s~{CSP_NONCE}~$CSP_NONCE~g" "${SHARED_CONFIG}/security_headers.conf"

echo "Done. Files in ${SHARED_CONFIG}:"
ls -lh "${SHARED_CONFIG}"