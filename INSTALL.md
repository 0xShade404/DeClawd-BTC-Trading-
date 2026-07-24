# Install & Deployment Guide

## Prerequisites

- **Node.js 20+** and **npm 10+** (`node -v`, `npm -v`) — enforced by the
  root `package.json` `engines` field.
- **Docker** and **Docker Compose v2** (`docker compose version`) — used
  for local Postgres/Redis and for the production deployment path.
- A GitHub checkout of this repo.

## 1. Local development

```bash
# 1. Copy the env template and fill in real values (see table below)
cp .env.example .env

# 2. Start just the datastores in Docker
docker compose up -d postgres redis

# 3. Install workspace dependencies (installs apps/web, apps/api,
#    packages/shared, packages/database, packages/trading-engine in one pass)
npm install

# 4. Generate the Prisma client and apply migrations
npm run prisma:migrate

# 5. Run the API (port 4000) and web app (port 3000) together
npm run dev
```

- Web app: http://localhost:3000
- API: http://localhost:4000 (health check at `/health`, Swagger UI at
  `/api/v1/docs`)

Run `npm run dev:api` or `npm run dev:web` individually if you only need
one side running.

### Getting real credentials for local dev

At minimum, fill these in before logging in / connecting a wallet works:

- **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`** — create an OAuth 2.0
  Client ID at https://console.cloud.google.com/apis/credentials
  (Application type: Web application). Add
  `http://localhost:4000/api/v1/auth/google/callback` as an authorized
  redirect URI (matches `GOOGLE_OAUTH_REDIRECT_URI` in `.env.example`).
- **`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`** — create a free project at
  https://cloud.walletconnect.com and copy its Project ID.

Everything else in `.env.example` has a working local default (Postgres/
Redis URLs matching the `docker-compose.yml` datastore credentials) or is
optional/feature-gated (see the table below).

## 2. Production deployment (one command)

```bash
cp .env.example .env
# Fill in every value in the "Required for production" rows below,
# especially the JWT/cookie secrets and OAuth credentials.

docker compose up -d --build
```

This builds and starts `postgres`, `redis`, `api`, and `web`. The `api`
container runs `prisma migrate deploy` automatically on startup (see
`apps/api/Dockerfile`'s `ENTRYPOINT`) before it starts listening, so
**no separate migration step is required** on a fresh deployment.

Optional, after first boot:

```bash
# Seed any reference/demo data
docker compose exec api npm run prisma:seed --workspace=packages/database

# Tail logs
docker compose logs -f api web

# Stop everything
docker compose down          # add -v to also drop the postgres_data volume
```

Generate strong secrets before deploying for real:

```bash
openssl rand -base64 64   # JWT_ACCESS_SECRET
openssl rand -base64 64   # JWT_REFRESH_SECRET (use a different run's output)
openssl rand -base64 32   # COOKIE_SECRET
npx web-push generate-vapid-keys   # VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY, if using browser push
```

## 3. Environment variables

Pulled from `.env.example`. "Required" means the app will not function
correctly (or a specific feature is silently disabled) without it.

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | Yes | `development` / `production` / `test` |
| `LOG_LEVEL` | No | Defaults to `info` |
| `DATABASE_URL` | Yes | Postgres connection string, used by Prisma |
| `REDIS_URL` | Yes | Cache/queue backend |
| `API_PORT` / `API_HOST` | Yes | API listens here (default `4000` / `0.0.0.0`) |
| `API_BASE_URL` | Yes | Public API base URL (used to build OAuth redirect etc.) |
| `WEB_BASE_URL` | Yes | Public web app URL (used for post-login redirects) |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins for the API |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Yes | Must be distinct, high-entropy, unique per environment |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | No | Defaults `15m` / `30d` |
| `COOKIE_SECRET` | Yes | Signs session cookies |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Yes | Login won't work without these — see above |
| `GOOGLE_OAUTH_REDIRECT_URI` | Yes | Must match the URI registered in Google Cloud Console |
| `POLYGON_RPC_URL` | Yes | Polygon RPC endpoint (Alchemy/Infura/QuickNode/self-hosted) |
| `POLYGON_CHAIN_ID` | Yes | `137` for Polygon mainnet |
| `USDC_CONTRACT_ADDRESS` | Yes | Defaults to Polygon USDC |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Yes | Wallet connection won't work without this — see above |
| `POLYMARKET_CLOB_API_URL` / `POLYMARKET_GAMMA_API_URL` | Yes | Defaults point at production Polymarket endpoints |
| `POLYMARKET_API_KEY` / `POLYMARKET_API_SECRET` / `POLYMARKET_API_PASSPHRASE` | Yes, to trade | Required before the trading engine can actually place orders — see checklist below |
| `BTC_PRICE_FEED_URL` | No | Defaults to CoinGecko |
| `NEWS_SENTIMENT_API_KEY` | No | Optional signal input; AI module degrades gracefully without it (`newsSentimentScore: null`) |
| `SMTP_*` | No | Only required to enable email notifications |
| `TELEGRAM_BOT_TOKEN` | No | Only required to enable Telegram notifications |
| `DISCORD_BOT_TOKEN` | No | Only required to enable Discord notifications |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | No | Only required to enable browser push notifications |
| `TRADING_CYCLE_CRON` | Yes | Cron schedule for the trading cycle, default every 15 minutes |
| `TRADING_ENGINE_ENABLED` | Yes | Global kill switch — `false` disables all automated trading regardless of per-user bot settings |
| `PROFIT_VAULT_ALLOCATION_PCT` / `PROFIT_TRADING_POOL_ALLOCATION_PCT` | Yes | Default profit split, must sum to 100 |
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Public, used by the browser to reach the API |
| `NEXT_PUBLIC_APP_ENV` | No | Cosmetic/env-labeling only |

## 4. Tests

```bash
npm run test              # runs each workspace's test suite (vitest)
npm run test:e2e          # apps/web Playwright e2e suite, if present
npm run lint
npm run typecheck
```

`packages/trading-engine` and `apps/web` use `vitest`; running the full
suite requires `npm run prisma:generate` to have been run at least once so
`@declawd/database`'s generated client exists.

## 5. Prisma Studio

```bash
npm run prisma:studio
```

Opens a local GUI against whatever `DATABASE_URL` currently points to —
useful for inspecting `LedgerAccount`/`LedgerEntry` balances, `BotRun`
history, or seeded `Market` data during development.

## 6. What needs real credentials before this is trade-ready

DeClawd is shipped with all of the following as a genuine, intentional
integration gap — not an oversight. The application runs, users can log
in, link wallets, and browse markets without them, but **automated trading
will not place real orders** until all of these are configured:

- [ ] A real **Google OAuth** app (`GOOGLE_CLIENT_ID`/`SECRET`) — required
      even for login, so this is the first blocker for any environment.
- [ ] A real **WalletConnect Cloud** project id
      (`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`) — required for wallet
      linking.
- [ ] **Polymarket CLOB API credentials**
      (`POLYMARKET_API_KEY`/`POLYMARKET_API_SECRET`/`POLYMARKET_API_PASSPHRASE`)
      — required for the `PolymarketProvider` to read live order books and
      relay orders.
- [ ] A funded **relayer/operator authorization** — the on-chain,
      user-granted, scoped trading approval that lets the automated 15-
      minute trading cycle place orders without a live browser session
      (see `ARCHITECTURE.md` §4 for the design). Each user must grant this
      explicitly and it is revocable at any time; there is no global
      operator key that trades on behalf of all users without individual,
      per-user, on-chain authorization.
- [ ] `TRADING_ENGINE_ENABLED=true` — the global kill switch defaults to
      `false` specifically so that a fresh deployment cannot trade real
      funds until an operator has deliberately reviewed the above and
      opted in.

Until these are in place, treat any deployment as a demo/staging
environment: markets, dashboards, and the AI signal pipeline are fully
functional against live market data, but the execution leg is inert.
