FROM node:24-alpine AS development-dependencies-env

COPY ./src/frontend/.npmrc /app/
COPY ./src/frontend/package.json /app/
COPY ./src/frontend/package-lock.json /app/
ARG FONTAWESOME_PACKAGE_TOKEN

WORKDIR /app
ENV NODE_ENV=development
RUN npm ci --include=dev
RUN npm install react-router-dev

RUN apk add jq vim procps less curl

EXPOSE 5173

RUN echo ls -al /app/node_modules/.bin

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