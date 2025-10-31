FROM node:24-alpine AS development-dependencies-env

COPY ./src/frontend/ /app/

# vite creates temporary files in /app
RUN chmod 0777 /app
#RUN find /app -type f -exec chmod 0644 {} \;

ARG FONTAWESOME_PACKAGE_TOKEN

WORKDIR /app
ENV NODE_ENV=development
RUN npm ci --include=dev

RUN mkdir /app/node_modules/.vite/
RUN chmod 0777 /app/node_modules/.vite/

RUN if [ ${DEBUG_BUILD} = true ]; then \
    apk add jq vim procps less curl; \
fi

EXPOSE 5173

# RUN ["npm", "run", "dev"]
# RUN ["node"]

# FROM node:20-alpine AS production-dependencies-env
# COPY ./src/frontend/package.json ./src/frontend/package-lock.json /app/
# WORKDIR /app
# RUN npm ci

# FROM node:20-alpine AS build-env
# COPY ./src/frontend/ /app/
# COPY --from=development-dependencies-env /app/node_modules /app/node_modules
# WORKDIR /app
# RUN npm run build

# FROM node:20-alpine
# COPY ./src/frontend/package.json ./src/frontend/package-lock.json /app/
# # COPY --from=development-dependencies-env /app/node_modules /app/node_modules
# # COPY --from=production-dependencies-env /app/node_modules /app/node_modules
# # COPY --from=build-env /app/build /app/build
# WORKDIR /app
# RUN npm ci --include=dev
