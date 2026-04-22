# syntax=docker/dockerfile:1
# =============================================================================
# Stage 1: deps — install all workspace dependencies
# =============================================================================
FROM node:24-alpine AS deps

WORKDIR /app

# Enable the correct pnpm version declared in package.json
RUN corepack enable

# Copy workspace manifest files needed for pnpm to resolve the workspace graph
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package manifests for all workspace members referenced by the backend
COPY apps/backend/package.json ./apps/backend/package.json
COPY packages/validators/package.json ./packages/validators/package.json

# Install all deps for the workspace (filter is not supported on install)
RUN pnpm install --frozen-lockfile

# =============================================================================
# Stage 2: build — compile TypeScript → dist/
# =============================================================================
FROM deps AS build

# Copy all source required to build
COPY apps/backend/ ./apps/backend/
COPY packages/validators/ ./packages/validators/

# Compile validators then backend (pnpm deploy does not run build scripts)
RUN pnpm --filter @fisio-app/backend... build

# Deploy production-only deps + compiled output to a clean directory
RUN pnpm deploy --filter @fisio-app/backend --prod /app/deploy

# =============================================================================
# Stage 3: runtime — minimal production image
# =============================================================================
FROM node:24-alpine AS runtime

WORKDIR /app

# Copy the clean deploy output (production deps + compiled backend)
# pnpm deploy includes workspace deps (validators/dist) automatically
COPY --from=build /app/deploy ./

# Run as non-root
USER node

# Document the port the server listens on (default 3000, overridable via PORT env)
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/v1/health || exit 1

CMD ["node", "dist/index.js"]