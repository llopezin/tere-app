# syntax=docker/dockerfile:1

# ─── Stage 1: install workspace deps ────────────────────────────────────────
FROM node:24-alpine AS deps

# Enable corepack so the correct pnpm version (from packageManager field) is used
RUN corepack enable

WORKDIR /app

# Copy manifests first so layer is cached until deps change.
# Root manifest + lockfile + every workspace package.json.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .node-version ./

COPY apps/client-app/package.json ./apps/client-app/package.json
COPY apps/backend/package.json     ./apps/backend/package.json
COPY packages/validators/package.json ./packages/validators/package.json
COPY packages/ui/package.json      ./packages/ui/package.json

# Install deps for @fisio-app/client-app and all workspace deps it needs
RUN pnpm install --frozen-lockfile


# ─── Stage 2: build the Vite SPA ────────────────────────────────────────────
FROM node:24-alpine AS build

RUN corepack enable

WORKDIR /app

# Reuse the installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/client-app/node_modules ./apps/client-app/node_modules

# Copy source for each workspace package needed at build time
COPY packages/validators/ ./packages/validators/
COPY packages/ui/         ./packages/ui/
COPY apps/backend/        ./apps/backend/
COPY apps/client-app/     ./apps/client-app/

# Root files needed by pnpm/tooling
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

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
