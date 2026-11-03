# syntax=docker/dockerfile:1

# ─── Stage 1: install workspace deps ────────────────────────────────────────
FROM node:24-alpine AS deps

# Enable corepack so the correct pnpm version (from packageManager field) is used
RUN corepack enable

WORKDIR /app

# Download every package in the lockfile into the pnpm store.
# This layer only depends on the lockfile, so it stays cached while deps don't change
# (editing a package.json script no longer forces a re-download).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./
RUN pnpm fetch

# Workspace manifests needed to link @fisio-app/client-app and its workspace deps
COPY apps/client-app/package.json ./apps/client-app/package.json
COPY apps/backend/package.json     ./apps/backend/package.json
COPY packages/validators/package.json ./packages/validators/package.json
COPY packages/ui/package.json      ./packages/ui/package.json

# Only links from the store, no network
RUN pnpm install --frozen-lockfile --offline


# ─── Stage 2: build the Vite SPA ────────────────────────────────────────────
FROM deps AS build

# Copy source for each workspace package needed at build time
# (per package, not `COPY . .`, so changes elsewhere don't bust this layer)
COPY packages/validators/ ./packages/validators/
COPY packages/ui/         ./packages/ui/
COPY apps/backend/        ./apps/backend/
COPY apps/client-app/     ./apps/client-app/

ARG VITE_API_URL
RUN pnpm -F @fisio-app/client-app... run build


# ─── Stage 3: serve with nginx (no Node in final image) ─────────────────────
FROM nginx:1.27-alpine AS runtime

# Remove the default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our SPA-friendly nginx config
COPY apps/client-app/nginx.conf /etc/nginx/conf.d/app.conf

# Copy the Vite build output
COPY --from=build /app/apps/client-app/dist /usr/share/nginx/html

# nginx master process runs as root (required to bind ports & manage workers),
# but worker processes drop to the unprivileged `nginx` user automatically.
# Port 8080 is used in nginx.conf so we never need to touch privileged ports.
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
