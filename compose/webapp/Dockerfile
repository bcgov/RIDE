# Use an official Python runtime as a parent image
FROM python:3.13-slim

# Install Python Package Libraries
RUN apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y \
      binutils \
      libproj-dev \
      gdal-bin \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Adding webapp directory to make absolute filepaths consistent across services
WORKDIR /app/webapp

# Install Python dependencies
COPY ./src/webapp/requirements /app/webapp/requirements
RUN pip install --no-cache-dir -r requirements/base.txt

COPY ./compose/webapp/entrypoint /
RUN sed -i 's/\r$//g' /entrypoint && chmod +x /entrypoint

COPY ./compose/webapp/start.sh /
RUN sed -i 's/\r$//g' /start.sh && chmod +x /start.sh

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
