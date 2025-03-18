FROM alpine:edge

EXPOSE 8080

RUN apk add gcompat bash curl tar gzip caddy

RUN curl -L https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux-amd64-rhel9.tar.gz \
| tar xvzf - -C /usr/local/bin \
&& chmod +x /usr/local/bin/oc

ENV KUBECONFIG=/tmp/.kube/config
ARG DEBUG_BUILD=false

# Add debugging tools into builds if enabled
RUN if [ ${DEBUG_BUILD} = true ]; then \
  apk add jq vim procps less; \
fi

ADD --chmod=755 ./app /app
ADD --chmod=755 ./start.sh /start.sh

CMD ["bash", "/start.sh"]
