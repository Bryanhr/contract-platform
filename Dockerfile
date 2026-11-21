# syntax=docker/dockerfile:1

# --- Build the Angular app ---
FROM node:22-alpine AS build

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build:prod

# --- Serve static files (Render sets $PORT) ---
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist/contract-platform/browser /usr/share/nginx/html

ENV PORT=80
EXPOSE 80

# Only substitute PORT — plain envsubst would wipe nginx $uri and break SPA reload
CMD ["/bin/sh", "-c", "envsubst '$PORT' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
