FROM alpine:3.21

RUN addgroup -S nonroot \
    && adduser -S nonroot -G nonroot

EXPOSE 8080

RUN apk add --no-cache \
    bash \
    curl \
    gcompat \
    gzip \
    tar \
    htop
  
RUN apk add --no-cache --repository http://dl-cdn.alpinelinux.org/alpine/edge/community caddy

RUN curl --proto "=https" -sSL https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux-amd64-rhel9.tar.gz \
| tar xvzf - -C /usr/local/bin \
&& chmod +x /usr/local/bin/oc

ENV KUBECONFIG=/tmp/.kube/config
ARG DEBUG_BUILD=false

# Add debugging tools into builds if enabled
RUN if [ ${DEBUG_BUILD} = true ]; then \
  apk add --no-cache jq less procps vim; \
fi

COPY --chmod=755 ./app /app
COPY --chmod=755 ./start.sh /start.sh

USER nonroot

CMD ["bash", "/start.sh"]
