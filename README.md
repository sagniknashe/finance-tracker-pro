# Finance Tracker Pro

Production-grade personal finance & expense tracking app.

**Stack:** Next.js (App Router) · TypeScript · Prisma · PostgreSQL · Auth.js (NextAuth v5) · Tailwind CSS · Recharts

> This repository currently contains **project setup and configuration only** — no application pages yet.

## Prerequisites

- Node.js ≥ 20 (`.nvmrc` pins 20)
- Docker (for local PostgreSQL) — or any reachable PostgreSQL 16 instance

## Getting started

```bash
# 1. Install dependencies (runs `prisma generate` via postinstall)
npm install

# 2. Configure environment
cp .env.example .env
#   - set AUTH_SECRET:  openssl rand -base64 32
#   - adjust DATABASE_URL / DIRECT_URL if not using the bundled Docker DB

# 3. Start PostgreSQL
docker compose up -d

# 4. Create the database schema
npm run prisma:migrate      # creates + applies the initial migration

# 5. (optional) seed default data
npm run db:seed

# 6. Run the dev server
npm run dev                 # http://localhost:3000
```

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start Next.js in development |
| `npm run build` | `prisma generate` + production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm run format` | Prettier write |
| `npm run prisma:migrate` | Create/apply dev migration |
| `npm run prisma:deploy` | Apply migrations (CI/prod) |
| `npm run prisma:studio` | Prisma Studio GUI |
| `npm run db:seed` | Seed default data |
| `npm run test` | Vitest (unit/integration) |
| `npm run test:e2e` | Playwright |

## Project layout

```
prisma/            schema.prisma, migrations, seed
src/
  app/             App Router (route groups: (auth), (app), api)
  components/      ui · charts · layout · features
  server/          services · repositories · actions · auth (Auth.js config)
  lib/             db, env, money, validation, import, rules, utils
  hooks/ stores/ types/ styles/
tests/             unit · integration · e2e
```

## Environment variables

See `.env.example` for the full, documented list. Required at minimum:
`DATABASE_URL`, `AUTH_SECRET`. OAuth and email vars are optional and feature-gate
the corresponding flows when present.

## Notes

- **Money** is stored and computed as `BigInt` minor units (cents); never floats.
- **Dark mode** uses the Tailwind `class` strategy via `next-themes`.
- DB-level `CHECK` constraints, `CITEXT`, and trigram indexes are applied through
  a hand-edited migration (Prisma cannot express them natively).
