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

# Install production + build-time deps for the backend and its workspace deps
RUN pnpm install --frozen-lockfile --filter @fisio-app/backend...

# =============================================================================
# Stage 2: build — compile TypeScript → dist/
# =============================================================================
FROM deps AS build

# Copy all source required to build
COPY apps/backend/ ./apps/backend/
COPY packages/validators/ ./packages/validators/

# Build the validators package first (it exports raw .ts — we need compiled JS
# at runtime when running node dist/index.js from the backend).
# TypeScript is a devDependency of the backend; use pnpm exec to run tsc from
# the backend workspace context which has typescript installed.
RUN pnpm --filter @fisio-app/backend exec tsc \
        --module ESNext --moduleResolution bundler \
        --target ES2020 --outDir /app/packages/validators/dist \
        --declaration --strict --skipLibCheck \
        /app/packages/validators/src/index.ts \
        /app/packages/validators/src/phone.ts \
        /app/packages/validators/src/nie.ts && \
    # Patch package.json exports to point at compiled output
    node -e " \
      const fs = require('fs'); \
      const p = JSON.parse(fs.readFileSync('/app/packages/validators/package.json', 'utf8')); \
      p.main = './dist/index.js'; \
      p.exports = { '.': { import: './dist/index.js', default: './dist/index.js' } }; \
      fs.writeFileSync('/app/packages/validators/package.json', JSON.stringify(p, null, 2)); \
    "

# Compile the backend
RUN pnpm --filter @fisio-app/backend run build

# =============================================================================
# Stage 3: runtime — minimal production image
# =============================================================================
FROM node:24-alpine AS runtime

WORKDIR /app

# Enable pnpm at the correct version
RUN corepack enable

# Copy workspace manifest files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/backend/package.json ./apps/backend/package.json

# Use the patched validators package.json from the build stage
COPY --from=build /app/packages/validators/package.json ./packages/validators/package.json

# Install production-only dependencies
RUN pnpm install --frozen-lockfile --prod --filter @fisio-app/backend...

# Copy compiled output from both packages
COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/packages/validators/dist ./packages/validators/dist

# Run as non-root
USER node

# Document the port the server listens on (default 3000, overridable via PORT env)
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3000}/api/v1/health || exit 1

CMD ["node", "apps/backend/dist/index.js"]
