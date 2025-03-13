FROM alpine:edge

EXPOSE 8080

RUN apk add gcompat bash curl tar gzip caddy

WORKDIR /tmp/
RUN curl -O https://mirror.openshift.com/pub/openshift-v4/clients/ocp/stable/openshift-client-linux-amd64-rhel9.tar.gz && \
tar xvzf ./openshift-client-linux-amd64-rhel9.tar.gz && \
rm ./openshift-client-linux-amd64-rhel9.tar.gz

USER root

RUN mv oc /usr/local/bin && \
    mv kubectl /usr/local/bin
RUN mkdir /.kube && \
    chmod 0777 /.kube

ARG DEBUG_BUILD=true

# Add debugging tools into builds if enabled
RUN if [ ${DEBUG_BUILD} = true ]; then \
  apk add jq vim procps less; \
fi

ADD --chmod=755 ./app /app
ADD --chmod=755 ./start.sh /start.sh

CMD ["bash", "/start.sh"]
