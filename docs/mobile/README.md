# Elevora Field — mobile agent docs

Durable specs and a local ticket board for the Elevora Field native app. Prefer these over re-reading the full plan.

## Start here

1. Open [`TICKETS.md`](./TICKETS.md) and claim the first unblocked ticket.
2. Read only the linked spec(s) for that ticket.
3. Match UI to [`design/elevora-mobile-prototype/`](../../design/elevora-mobile-prototype/) (open `index.html`).
4. Follow the monorepo adapter in [`design/ELEVORA-MOBILE-APP-PLAN.md`](../../design/ELEVORA-MOBILE-APP-PLAN.md) (Fastify `/v1/mobile`, `@hr/shared`).
5. After Phase 0: consult [`design/MOBILE-AUDIT.md`](../../design/MOBILE-AUDIT.md) before API work.

## Ground rules (every session)

1. **`apps/api` is the system of record.** The phone may pre-check (geofence, balance) for UX; the server re-validates everything.
2. **Reuse Fastify services.** Extract from route handlers into `apps/api/src/services/*` with no behavior change when needed. Do not fork logic into the mobile app.
3. **Idempotent writes.** Every phone write is an event with a client-generated UUID.
4. **Offline-first** for Today/clock, map packs, shifts, leave (view + create), tasks (view + status + deliverables), history. Writes go through a local outbox.
5. **Additive only.** Do not change existing web routes, permissions, or plan gating.
6. **TypeScript strict.** Shared types live in `@hr/shared`. Visual tokens come from `packages/tokens` (sourced from the prototype CSS).

## Spec index

| Spec | Topic |
|---|---|
| [00-architecture.md](./specs/00-architecture.md) | Stack, sync, entitlements |
| [01-api-surface.md](./specs/01-api-surface.md) | `/v1/mobile/*` endpoints |
| [02-ui-kit.md](./specs/02-ui-kit.md) | Components + exact sizes |
| [03-screen-map.md](./specs/03-screen-map.md) | Prototype id → Expo route |
| [04-clock-tracking.md](./specs/04-clock-tracking.md) | Clock, geofence, background GPS |
| [05-maps-offline.md](./specs/05-maps-offline.md) | MapLibre + offline packs |
| [06-shifts-leave-tasks.md](./specs/06-shifts-leave-tasks.md) | Domain screens + outbox types |
| [07-history-alerts-profile.md](./specs/07-history-alerts-profile.md) | History, push, profile, team |
| [08-qa-release.md](./specs/08-qa-release.md) | Device matrix, EAS, stores |
| [STORE-COMPLIANCE.md](./STORE-COMPLIANCE.md) | App Store / Play pre-submit checklist |
| [store-ops/](./store-ops/README.md) | Console copy-paste pack (Data safety, Review notes, video) |

## Out of scope (v1)

Hiring, compensation, KPI administration, analytics, integrations, billing, settings, and platform admin stay on the web. The app may deep-link to the web for those.
