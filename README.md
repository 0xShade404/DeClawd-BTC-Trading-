# DeClawd

**DeClawd** is a lightweight, production-ready, AI-powered, non-custodial prediction market trading platform focused on automated Bitcoin (BTC) trading on [Polymarket](https://polymarket.com).

Connect a wallet, enable the AI trading agent, and let it trade eligible BTC prediction markets on your behalf — every trade is signed by your own wallet, profits are automatically split between a protected vault and an active trading pool, and you can withdraw at any time.

> DeClawd never custodies funds and never asks for a seed phrase. All on-chain actions require your wallet's signature.

## Documentation

| Doc | Description |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System design, folder structure, trading engine architecture |
| [SECURITY.md](./SECURITY.md) | Threat model, auth, RBAC, wallet verification, hardening checklist |
| [INSTALL.md](./INSTALL.md) | Local development & production deployment guide |
| [docs/api/openapi.yaml](./docs/api/openapi.yaml) | REST API specification |

## Monorepo layout

```
DeClawd/
├── apps/
│   ├── web/              # Next.js 14 App Router frontend
│   └── api/               # Fastify REST API
├── packages/
│   ├── shared/            # Shared TypeScript types, zod schemas, constants
│   ├── database/          # Prisma schema + generated client
│   └── trading-engine/    # Market scanner, AI module, risk engine, execution, settlement
├── docs/                  # API spec & supplementary docs
└── docker-compose.yml
```

## Stack

- **Frontend:** Next.js (App Router), React, TypeScript, TailwindCSS, shadcn/ui-style components, Framer Motion, wagmi/viem
- **Backend:** Node.js, Fastify, TypeScript
- **Database:** PostgreSQL via Prisma
- **Cache/Queue:** Redis (BullMQ for the trading cycle scheduler)
- **Auth:** Google OAuth (no passwords) + wallet signature linking
- **Chain:** Polygon, USDC, Polymarket CLOB

## Quick start

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run prisma:migrate
npm run dev
```

Web app: http://localhost:3000
API: http://localhost:4000 (docs at `/docs`)

See [INSTALL.md](./INSTALL.md) for full setup, including Google OAuth and WalletConnect credentials, and for the one-command Docker deployment.

## Non-custodial guarantee

- DeClawd never stores private keys or seed phrases.
- The backend never has signing authority over user funds.
- Trade execution requires either a live wallet signature or a scoped, user-revocable session (e.g. Polymarket's own delegated trading approvals) that the user explicitly grants on-chain.
- Withdrawals move funds directly from the user's smart contract balance to their wallet — DeClawd is not a counterparty.

## License

MIT
