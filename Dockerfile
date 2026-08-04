# The builder image contains the project and npm dependencies so scheduled
# refreshes can run without mounting the host checkout into a networked build.
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# The public web image is only nginx plus a small static-site config. Generated
# files are supplied by the compose volume at runtime and mounted read-only.
FROM nginx:1.27-alpine AS site
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
