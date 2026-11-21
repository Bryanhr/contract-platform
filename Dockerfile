# syntax=docker/dockerfile:1

FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build:prod

FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/spa.conf
COPY --from=build /app/dist/contract-platform/browser /usr/share/nginx/html

ENV PORT=80
EXPOSE 80

CMD ["/bin/sh", "-c", "sed 's/PORT_PLACEHOLDER/'\"$PORT\"'/' /etc/nginx/spa.conf > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
