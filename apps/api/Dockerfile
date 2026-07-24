########################################################################
# DeClawd API - apps/api
#
# Multi-stage build for the Fastify API server, built as part of the
# npm workspaces monorepo. Build context MUST be the repo root, e.g.:
#
#   docker build -f apps/api/Dockerfile -t declawd-api .
#
# ASSUMPTIONS (apps/api is being scaffolded by a parallel agent and did
# not yet have a package.json or src/server.ts at the time this file was
# written):
#   - apps/api/package.json defines a "build" script producing apps/api/dist
#     (rootDir "src" / outDir "dist" per apps/api/tsconfig.json, already
#     present in the repo) and a compiled entrypoint at apps/api/dist/server.js.
#   - The root `npm run build` script order (packages/shared -> database ->
#     trading-engine -> apps/api) is respected here explicitly.
# If the real entrypoint differs (e.g. dist/index.js, dist/main.js), update
# the CMD path at the bottom of the runner stage accordingly.
########################################################################

# ---------- deps: install workspace dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app

# Copy only manifests needed to resolve apps/api's dependency graph, for
# maximum layer-cache reuse (apps/web is intentionally excluded so this
# image never pulls in frontend dependencies).
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/trading-engine/package.json packages/trading-engine/package.json
COPY apps/api/package.json apps/api/package.json

RUN npm ci

# ---------- builder: compile TypeScript ----------
FROM node:20-alpine AS builder
WORKDIR /app

# Prisma's query engine needs OpenSSL to download/run correctly on alpine.
RUN apk add --no-cache openssl

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY tsconfig.base.json ./
COPY packages ./packages
COPY apps/api ./apps/api

# Builds in dependency order: shared -> database (also runs `prisma
# generate`) -> trading-engine -> api.
RUN npm run build --workspace=packages/shared \
  && npm run build --workspace=packages/database \
  && npm run build --workspace=packages/trading-engine \
  && npm run build --workspace=apps/api

# ---------- runner: minimal production image ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache openssl curl \
  && addgroup -S declawd && adduser -S declawd -G declawd

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/apps/api ./apps/api

USER declawd

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Run pending Prisma migrations, then start the server. This is what
# makes `docker compose up -d --build` a genuine one-command deployment -
# no separate `docker compose exec api npx prisma migrate deploy` step is
# required on a fresh environment.
#
# ASSUMPTION: compiled entrypoint is apps/api/dist/server.js - adjust if
# apps/api's actual build output differs.
ENTRYPOINT ["/bin/sh", "-c", "npm run prisma:migrate:deploy --workspace=packages/database && node apps/api/dist/server.js"]
