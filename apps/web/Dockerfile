########################################################################
# DeClawd Web - apps/web (Next.js 14, App Router)
#
# Multi-stage build using Next.js "standalone" output. Build context MUST
# be the repo root, e.g.:
#
#   docker build -f apps/web/Dockerfile -t declawd-web .
#
# REQUIRES apps/web/next.config.mjs to set `output: 'standalone'`. As of
# writing, apps/web/next.config.mjs (owned by a parallel agent) does NOT
# yet set this option:
#
#   const nextConfig = {
#     reactStrictMode: true,
#     transpilePackages: ['@declawd/shared'],
#     experimental: { typedRoutes: false },
#   };
#
# Add `output: 'standalone'` to that config or this image's runner stage
# (which copies .next/standalone) will not find a server.js to run.
########################################################################

# ---------- deps: install workspace dependencies ----------
FROM node:20-alpine AS deps
WORKDIR /app

# apps/web only depends on @declawd/shared among internal packages.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

# ---------- builder: build the Next.js app ----------
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json /app/package-lock.json ./
COPY tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/web ./apps/web

# apps/web/public does not exist in the repo as of this writing (no static
# assets committed yet). Guarantee the directory exists so the runner
# stage's COPY below never fails, whether or not a public/ dir has since
# been added by the time this image is actually built.
RUN mkdir -p apps/web/public

# NEXT_PUBLIC_* env vars are inlined into the client bundle at build time,
# so they must be provided as build args (see docker-compose.yml `web.build.args`).
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
ARG NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
ARG NEXT_PUBLIC_APP_ENV=production
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
ENV NEXT_PUBLIC_APP_ENV=$NEXT_PUBLIC_APP_ENV

RUN npm run build --workspace=apps/web

# ---------- runner: minimal production image ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache curl \
  && addgroup -S declawd && adduser -S declawd -G declawd

# Next.js standalone output, when built inside an npm-workspaces monorepo,
# preserves the workspace path (apps/web/server.js) rather than putting
# server.js at the output root - copy it to /app as-is and run from there.
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER declawd

EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "apps/web/server.js"]
