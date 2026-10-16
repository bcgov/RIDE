# ==========================================
# STAGE: Compile patched America/Vancouver and America/Edmonton timezone data
# TEMPORARY STAGE: This is to support the PCT timezone code for America/Vancouver and MDT for America/Edmonton. 
# This is hopefully a temporary patch until the IANA timezone database is updated to include this timezone code.
# ==========================================
FROM alpine:3.24 AS tzbuild
RUN apk add --no-cache build-base curl
WORKDIR /tz

RUN curl -fsSLO https://data.iana.org/time-zones/releases/tzcode2026e.tar.gz \
 && curl -fsSLO https://data.iana.org/time-zones/releases/tzdata2026e.tar.gz \
 && tar -xzf tzcode2026e.tar.gz \
 && tar -xzf tzdata2026e.tar.gz \
 && make zic

RUN sed -i '/^Zone America\/Vancouver/,/^Zone America\/Dawson_Creek/ s/^\([[:space:]]*-7:00[[:space:]]*-[[:space:]]*\)MST/\1PCT/' northamerica \
 && sed -n '/^Zone America\/Vancouver/,/^Zone America\/Dawson_Creek/p' northamerica | grep -q 'PCT'

RUN sed -i '/^Zone America\/Edmonton/,/^Zone America\/Vancouver/ s/^\([[:space:]]*-6:00[[:space:]]*-[[:space:]]*\)CST/\1MDT/' northamerica \
 && sed -n '/^Zone America\/Edmonton/,/^Zone America\/Vancouver/p' northamerica | grep -qE '^[[:space:]]*-6:00[[:space:]]+-[[:space:]]+MDT'

RUN ./zic -b fat -d /out -L /dev/null northamerica


# Use an official Python runtime as a parent image
FROM python:3.14-slim

# Install Python Package Libraries
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y \
      binutils \
      libproj-dev \
      gdal-bin \
      curl \
      ca-certificates \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# --- Temporary timezone patch for Vancouver and Edmonton Timezones --- 
COPY --from=tzbuild /out/America/Vancouver /usr/share/zoneinfo/America/Vancouver
COPY --from=tzbuild /out/America/Edmonton  /usr/share/zoneinfo/America/Edmonton
# --- End Temporary timezone patch for Vancouver and Edmonton Timezones --- 

# Adding webapp directory to make absolute filepaths consistent across services
WORKDIR /app/webapp

# Install Python dependencies
COPY ./src/webapp/requirements /app/webapp/requirements
RUN pip install --no-cache-dir -r requirements/base.txt

COPY ./compose/webapp/entrypoint /
RUN sed -i 's/\r$//g' /entrypoint && chmod +x /entrypoint

COPY ./compose/webapp/leader-election.py /
RUN sed -i 's/\r$//g' /leader-election.py && chmod +x /leader-election.py

COPY ./compose/webapp/start.sh /
RUN sed -i 's/\r$//g' /start.sh && chmod +x /start.sh

COPY ./compose/webapp/start_openshift.sh /
RUN sed -i 's/\r$//g' /start_openshift.sh && chmod +x /start_openshift.sh

COPY ./compose/webapp/start_tasks.sh /
RUN sed -i 's/\r$//g' /start_tasks.sh && chmod +x /start_tasks.sh

COPY ./compose/webapp/start_tasks_openshift.sh /
RUN sed -i 's/\r$//g' /start_tasks_openshift.sh && chmod +x /start_tasks_openshift.sh

# Add the rest of the code
COPY ./src/webapp /app/webapp
COPY ./compose/webapp/.vimrc /
COPY ./compose/webapp/.vimrc /root

# Create static and media folders with rw permissions
RUN mkdir -p /app/static && chgrp -R 0 /app/static && chmod -R g=u /app/static && chmod 775 /app/static
RUN mkdir -p /app/media && chgrp -R 0 /app/media && chmod -R g=u /app/media && chmod 775 /app/media


ARG DEBUG_BUILD=false

# Add debugging tools into builds if enabled
RUN if [ "$DEBUG_BUILD" = "true" ]; then \
      apt-get update && \
      DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        jq \
        vim \
        procps \
        dnsutils \
        less && \
      rm -rf /var/lib/apt/lists/*; \
    fi
ENTRYPOINT ["/entrypoint"]

# Make port 8000 available for the app
EXPOSE 8000
