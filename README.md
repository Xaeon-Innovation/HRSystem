# HR Track — Creative Multi Solutions HR & Workforce Tracking

Multi-tenant HR platform: employee management, digital clock in/out, realtime GPS live map, KPIs, and notifications.

## Stack

- **Web:** Next.js 15 + shadcn-style UI + PWA (mobile-first)
- **API:** Fastify + WebSockets (`/ws`)
- **DB:** PostgreSQL + Drizzle ORM
- **Monorepo:** pnpm workspaces + Turborepo

## Quick start

```bash
# prerequisites: Node 22+, pnpm 9, Docker *or* local Postgres 16
cp .env.example .env

# Option A — Docker
docker compose up -d

# Option B — Homebrew Postgres (no Docker)
# brew install postgresql@16
# export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
# initdb -D ~/.local/pgdata-hr -U hr --auth-local=trust --auth-host=trust
# pg_ctl -D ~/.local/pgdata-hr -l ~/.local/pgdata-hr.log start
# createdb -U hr hr_system

export PATH="$HOME/.local/node/bin:$PATH"   # if using local node install
pnpm install
pnpm --filter @hr/shared build
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Web: http://localhost:3000  
- API: http://localhost:4000/health  

### Seed accounts

| Role | Email | Password | Tenant slug |
|------|-------|----------|-------------|
| Super admin | superadmin@hr.local | SuperAdmin123! | (none) |
| CMS admin | admin@cms.local | Admin123! | cms |
| CMS employee | employee@cms.local | Employee123! | cms |
| Acme admin | admin@acme.local | Admin123! | acme |

## Packages

- `apps/web` — Next.js PWA
- `apps/api` — Fastify REST `/v1` + WebSocket
- `packages/db` — Drizzle schema/migrations/seed
- `packages/shared` — Zod schemas + constants

## Docs

- [API contract](docs/API.md)
- [Tenant onboarding](docs/ONBOARDING.md)
- [Billing (Paymob)](docs/BILLING.md)
- [Data retention & privacy](docs/PRIVACY.md)
- [Production / hosting](docs/HOSTING.md)

## Phases delivered

1. Foundations & multi-tenant auth  
2. Employees, attendance, offline clock queue  
3. Realtime location + live map + retention job  
4. KPI templates & summaries  
5. Notifications, announcements, admin dashboard metrics  
6. CI, isolation tests, docs / launch prep  
7. Platform admin: tenants, Paymob subscriptions, audits  
