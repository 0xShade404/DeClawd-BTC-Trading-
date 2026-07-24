########################################################################
# DeClawd API - apps/api
#
# Multi-stage build for the Fastify API server, built as part of the
# npm workspaces monorepo. Build context MUST be the repo root, e.g.:
#
#   docker build -f apps/api/Dockerfile -t declawd-api .
#
# NOTE on the runtime entrypoint: packages/shared, packages/database, and
# packages/trading-engine all declare "main"/"types" as "./src/index.ts"
# (consumed as TypeScript source directly, not a compiled "dist" output -
# see each package.json). That means a plain `node apps/api/dist/server.js`
# would fail at runtime: requiring `@declawd/shared` etc. would try to
# `require()` a .ts file, which plain Node cannot parse. `npm run build`
# (tsc) is still run below for typecheck/declaration-file purposes, but the
# actual process is started with `tsx`, which transpiles TypeScript
# on-the-fly for the entrypoint AND everything it transitively requires
# (including those workspace packages' source) - see apps/api/package.json's
# "start" script.
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

# Run pending Prisma migrations, then start the server via the "start"
# script (`tsx src/server.ts` - see NOTE at the top of this file for why
# plain `node dist/server.js` isn't used). This is what makes
# `docker compose up -d --build` a genuine one-command deployment - no
# separate `docker compose exec api npx prisma migrate deploy` step is
# required on a fresh environment.
ENTRYPOINT ["/bin/sh", "-c", "npm run prisma:migrate:deploy --workspace=packages/database && npm run start --workspace=apps/api"]
