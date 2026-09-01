# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./

RUN corepack enable \
    && yarn install --immutable

COPY . .

ARG VITE_API_BASE_URL
ARG VITE_ROOT_RESOURCE_ID

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_ROOT_RESOURCE_ID=${VITE_ROOT_RESOURCE_ID}

RUN yarn build

FROM nginx:1.28.0-alpine3.21

COPY deploy/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1
