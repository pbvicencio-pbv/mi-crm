# syntax=docker/dockerfile:1.7
# ============================================================
# Dockerfile — multi-stage, cache-optimized for Railway
# ============================================================
# Key principles:
#   1. Copy lockfile FIRST, install deps, THEN copy source.
#      This way deps layer is cached unless lockfile changes.
#   2. Use `node` directly (not `npm start`) so SIGTERM forwards.
#   3. Run as non-root in production. Set RAILWAY_RUN_UID=0
#      service var only if writing to a mounted volume.
#   4. Consume RAILWAY_DEPLOYMENT_ID AFTER cacheable layers if at all.
#   5. Multi-stage: build env has dev deps, runtime stage is slim.
# ============================================================

ARG NODE_VERSION=22

# ---------- Stage 1: install dependencies ----------
FROM node:${NODE_VERSION}-slim AS deps
WORKDIR /app

# Install pnpm via corepack (built into Node 22+)
RUN corepack enable

# Copy ONLY lockfile + manifest first — this layer caches across deploys
# unless dependencies change.
COPY package.json pnpm-lock.yaml ./

# Install with frozen lockfile and BuildKit cache mount for the pnpm store
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# ---------- Stage 2: build ----------
FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app

RUN corepack enable

# Reuse the deps layer
COPY --from=deps /app/node_modules ./node_modules
COPY package.json pnpm-lock.yaml ./

# NOW copy source (this layer changes often — keep it late)
COPY . .

RUN pnpm run build

# Strip dev dependencies for the runtime image
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --prod

# ---------- Stage 3: runtime ----------
FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

# Add tini for proper PID 1 / signal forwarding (alternative to using `node` directly)
# RUN apt-get update && apt-get install -y --no-install-recommends tini && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production

# Copy only what's needed at runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Run as non-root user (Node image has 'node' user UID 1000)
USER node

# Railway sets PORT at runtime; bind 0.0.0.0:$PORT (or [::]:$PORT for dual-stack)
EXPOSE 3000

# Use `node` directly so SIGTERM is forwarded to the Node process
# (npm start / yarn start / pnpm start often swallow signals)
CMD ["node", "dist/server.js"]

# Optional: with tini installed (uncomment apt-get above):
# ENTRYPOINT ["/usr/bin/tini", "--"]
# CMD ["node", "dist/server.js"]
