# Security

DeClawd handles user funds indirectly (via non-custodial wallet
authorization) and executes automated trades on a user's behalf. This
document describes the threat model, the controls in place, and what a
security reviewer or pentester should focus on.

## Non-custodial guarantee (read this first)

- **DeClawd never asks for, transmits, or stores a private key or seed
  phrase, under any circumstance.** There is no form field, API endpoint,
  or database column for one. Any UI, email, or support flow that asks a
  user for their seed phrase is not DeClawd and should be reported as
  fraudulent.
- The backend cannot construct a valid signed order or a valid withdrawal
  without an action the user's own wallet took (either a live browser
  signature, or a scoped, on-chain, user-revocable trading authorization —
  see `ARCHITECTURE.md` §4). Compromising the DeClawd database or API
  server does **not**, by itself, give an attacker the ability to move
  user funds anywhere the user hasn't already authorized on-chain.
- Withdrawals always target a `destinationAddress` and settle directly
  from the user's own on-chain balance; DeClawd is never an intermediary
  custodian of withdrawn funds.

This does not eliminate risk (see "What this does not protect against"
below) — it bounds the blast radius of a backend compromise to funds the
user has actively placed at risk in the Trading Pool via an authorization
they can revoke on-chain at any time.

## Authentication

- **Google OAuth only** — no password storage, no password-reset flow, no
  password-related attack surface (credential stuffing, weak passwords,
  password DB leaks). `User.googleSubject` is the durable identity anchor.
- **JWT access + refresh, rotated** — short-lived access token
  (`JWT_ACCESS_TTL`, default 15m) plus a longer-lived refresh token
  (`JWT_REFRESH_TTL`, default 30d), both delivered as **httpOnly, Secure,
  SameSite cookies** (`declawd_access_token` / `declawd_refresh_token` —
  see `packages/shared/src/constants.ts`), never exposed to JavaScript and
  never returned in a JSON response body. `POST /api/v1/auth/refresh`
  rotates the access token; logout (`POST /api/v1/auth/logout`) clears
  both cookies server-side.
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET` must each
  be distinct, high-entropy values in production (`.env.example` documents
  generating them with `openssl rand -base64 64`). Reusing one secret
  across purposes, or using the example placeholder values, is a
  deploy-blocking misconfiguration.

## Wallet linking & signature verification

- Linking a wallet is a two-step, SIWE-style ("Sign-In with Ethereum")
  flow: `POST /api/v1/wallet/nonce` issues a single-use nonce/message tied
  to the requesting user and address; `POST /api/v1/wallet/link` requires
  the caller to return a signature over that exact message.
- **The server never trusts a claimed address without independently
  recovering the signer from the signature and message and confirming it
  matches.** A request that supplies an address but an invalid or
  mismatched signature is rejected with `WALLET_VERIFICATION_FAILED`
  (422) — the address is never persisted to `Wallet` on that path.
- Nonces are single-use and time-bounded (`expiresAt`) to prevent replay
  of a captured signature after the fact.
- `Wallet` rows are unique on `(address, chainId)` — a given address can't
  be silently re-linked to a second account out from under its owner.

## Authorization (RBAC)

- Three roles on `User.role`: `USER`, `ADMIN`, `SUPPORT`.
- All `/api/v1/admin/*` routes require `ADMIN` (or `SUPPORT` for
  read-only user/position listing, per the OpenAPI spec) — enforced
  server-side on every request, never inferred from client-supplied state.
- Every non-admin route scopes its data access to the authenticated
  user's own `userId` — there is no endpoint that accepts an arbitrary
  user id from the client to read or mutate another user's positions,
  ledger, wallets, or settings. Reviewers should specifically try IDOR
  variants of every `{id}` path parameter (e.g. `GET /api/v1/wallet/{id}`,
  `DELETE /api/v1/wallet/{id}`) with an id belonging to a different user.

## Rate limiting

- Auth endpoints (`/api/v1/auth/*`) and wallet-linking endpoints
  (`/api/v1/wallet/nonce`, `/api/v1/wallet/link`) should be rate-limited
  per-IP and per-account to blunt brute-force/nonce-guessing and OAuth
  callback abuse.
- Trading-affecting endpoints (`/api/v1/bot/enable`, `/api/v1/withdrawals`)
  should be rate-limited per-account independent of the global limiter, so
  a compromised or malfunctioning client can't spam withdrawal requests or
  toggle the bot in a tight loop.
- `ErrorCode.RATE_LIMITED` (429) is a first-class envelope error code for
  this (`packages/shared/src/api-envelope.ts`).

## CSRF

- Because auth state lives in cookies rather than a client-readable
  bearer token, state-changing endpoints (`POST`/`PATCH`/`DELETE`) must
  enforce CSRF protection — `SameSite=Strict` (or `Lax` where the OAuth
  redirect flow requires it) on both auth cookies, plus a
  double-submit/`Origin`-header check on mutating requests, since
  `SameSite` alone is defense-in-depth, not a complete answer.

## XSS / Content Security Policy

- `apps/web` must set a restrictive CSP (no `unsafe-inline` script
  execution, explicit `connect-src` limited to `API_BASE_URL` and the RPC/
  WalletConnect endpoints it actually needs) to limit the impact of any
  injected script, especially given that wallet interactions happen
  client-side.
- Because JWTs are httpOnly, a successful XSS cannot directly exfiltrate
  the session cookie — but it could still trick a connected wallet into
  signing a malicious order/withdrawal message, so CSP and strict output
  encoding on any user-controlled or third-party (market question text,
  news sentiment) content rendered in the UI are both required.

## Injection / input validation

- **SQL injection**: all database access goes through Prisma's
  parameterized query builder (`@declawd/database`) — no raw string-
  concatenated SQL. Any future use of `$queryRawUnsafe` or similar should
  be treated as a flagged exception requiring explicit review.
- **Input validation**: request bodies/query params are validated with
  `zod` schemas (`packages/shared/src/schemas/*`) before touching business
  logic, rejecting with `VALIDATION_ERROR` (400) on any mismatch. This
  applies uniformly across auth, wallet, settings, and withdrawal inputs —
  reviewers should fuzz these boundaries (oversized strings, wrong types,
  unexpected enum values, negative amounts) rather than assume the
  Fastify route layer alone is sufficient.

## Secret management

- All secrets are environment variables, never committed — `.env` is
  gitignored (see `.gitignore`), and `.env.example` documents every
  variable name with a placeholder or safe default, never a real value.
- In production, secrets should come from a proper secret manager (Vault,
  AWS Secrets Manager, Doppler, etc.) injected into the container
  environment, not baked into the image or checked into `docker-compose.yml`.
- Third-party credentials in scope: `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`,
  `POLYMARKET_API_KEY`/`POLYMARKET_API_SECRET`/`POLYMARKET_API_PASSPHRASE`,
  SMTP credentials, `TELEGRAM_BOT_TOKEN`, `DISCORD_BOT_TOKEN`, VAPID keys,
  `POLYGON_RPC_URL` (if using an authenticated provider like Alchemy).

## Audit logging

- `AuditLog` (`actorType`, `actorId`, `action`, `entityType`, `entityId`,
  `metadata`, `ipAddress`, `userAgent`) should be written for every
  security-relevant action: login, wallet link/unlink, settings change,
  bot enable/disable, withdrawal request, and all admin actions.
- `BotRun` provides a parallel, automated-side audit trail for every
  trading-cycle execution (see `ARCHITECTURE.md` §5), independent of
  user-initiated actions.
- Audit logs should be treated as append-only from the application layer
  (no update/delete path) and are a primary source for incident
  reconstruction.

## What a security reviewer / pentester should focus on

1. Wallet-link signature verification — attempt to link an address without
   a valid signature, with a signature from a different address, or with
   a replayed/expired nonce.
2. IDOR across every `{id}`-scoped route (wallet, withdrawals, positions,
   settings) using another user's id.
3. Admin route authorization — confirm `USER`/`SUPPORT` cannot reach
   `ADMIN`-only actions, and `SUPPORT` cannot exceed its intended
   read-only scope.
4. Withdrawal request validation — negative/zero amounts, amounts
   exceeding the sourced `LedgerAccount` balance, and whether the
   `INSUFFICIENT_BALANCE` (422) path is actually enforced server-side
   (not just client-side).
5. Trading-engine kill switch — confirm `TRADING_ENGINE_ENABLED=false`
   and a per-user `bot disable` genuinely halt new trade execution
   end-to-end, including any in-flight cycle.
6. Cookie flags in a real deployment — `Secure`, `HttpOnly`, `SameSite`
   all set correctly behind the actual production TLS-terminating proxy,
   not just in local dev.
7. Rate limiting on `/api/v1/auth/*` and `/api/v1/wallet/*` under load.
8. Dependency and container supply chain — `npm audit` / a Trivy-style
   scan of the built `api`/`web` images, and pinning of the `postgres:16-alpine`
   / `redis:7-alpine` base images used in `docker-compose.yml`.

## What this does not protect against

- A user who is socially engineered into signing a malicious transaction
  outside of DeClawd's UI (e.g. via a phishing site) — wallet security is
  ultimately the user's responsibility; DeClawd's non-custodial design
  limits *DeClawd's* blast radius, not general wallet-security hygiene.
- Smart-contract or protocol-level risk in Polymarket's own contracts,
  which is out of DeClawd's control and should be evaluated independently.
- Compromise of the operator/relayer authorization itself if the user
  grants an overly broad on-chain approval outside of what DeClawd's UI
  requests — the UI should request the minimum scope necessary and
  clearly disclose exactly what is being authorized before the user signs.

## Responsible disclosure

If you believe you've found a security vulnerability in DeClawd, please
report it privately rather than opening a public issue.

- **Contact:** security@declawd.app *(placeholder — replace with a real
  monitored address before production launch)*
- Please include: affected component, reproduction steps, and potential
  impact. We aim to acknowledge reports within 3 business days.
- Please do not test against production user accounts or attempt to
  exfiltrate real funds/data — use a local `docker compose up` environment
  (see `INSTALL.md`) or a dedicated staging deployment with test
  credentials.
