# syntax=docker/dockerfile:1

############################################
# Builder: Frontend                        #
############################################
FROM node:24-alpine AS buildnode

WORKDIR /app/
COPY ./src/frontend/ /app/

ARG DEBUG_BUILD=false
ENV DEBUG_BUILD=$DEBUG_BUILD
ARG SOURCEMAP=false
ENV SOURCEMAP=$SOURCEMAP

ENV NODE_ENV=production

RUN --mount=type=secret,id=FONTAWESOME_PACKAGE_TOKEN \
    test -s /run/secrets/FONTAWESOME_PACKAGE_TOKEN || { echo "FONTAWESOME_PACKAGE_TOKEN secret missing"; exit 1; }; \
    export FONTAWESOME_PACKAGE_TOKEN="$(cat /run/secrets/FONTAWESOME_PACKAGE_TOKEN)" && \
    npm ci --include=dev

RUN npm run build

# Generate pre-compressed static assets: Gzip, Brotli, and Zstandard
RUN apk add --no-cache gzip brotli zstd && \
    find /app/build/client -type f \( \
      -name '*.js' -o -name '*.css' -o -name '*.html' -o -name '*.json' -o -name '*.svg' \
    \) -exec sh -c ' \
      gzip -9 -fk "$1" && \
      brotli -q 11 -fk "$1" && \
      zstd -19 -fk "$1" \
    ' _ {} \;

############################################
# Builder: Custom Caddy with Redis & Cache #
############################################
FROM caddy:2.11-builder-alpine AS caddy-builder
RUN xcaddy build \
    --with github.com/caddyserver/cache-handler \
    --with github.com/darkweak/storages/go-redis/caddy

############################################
# Runtime: Caddy serving assets            #
############################################
FROM caddy:2.11-alpine

RUN apk add --no-cache brotli gzip bash zstd

EXPOSE 3000

# Copy Cache Handler plugin from builder
COPY --from=caddy-builder /usr/bin/caddy /usr/bin/caddy

RUN apk add --no-cache libcap && setcap -r /usr/bin/caddy || true

RUN chmod -R g=u /data /config /etc/caddy

RUN mkdir -p /config/caddy /data/caddy /etc/caddy /usr/share/caddy/html /logs && \
    chmod -R 777 /config/caddy /data/caddy /etc/caddy /logs

COPY --from=buildnode /app/build/client /usr/share/caddy/html

COPY ./compose/frontend_caddy/Caddyfile /etc/caddy/Caddyfile

COPY --chmod=755 ./compose/frontend_caddy/generate-config.sh /tmp/generate-config.sh

CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile"]