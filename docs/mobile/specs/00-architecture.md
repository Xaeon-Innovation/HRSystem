# 00 — Architecture

## Monorepo layout (target)

```
elevora/
  apps/
    api/                 # Fastify — system of record (/v1 + /v1/mobile + /ws)
    web/                 # Next.js PWA (unchanged except additive badges)
    mobile/              # Expo (dev client) — Polara Field
  packages/
    db/                  # @hr/db — Drizzle/Postgres (existing)
    shared/              # @hr/shared — domain Zod + mobile Me/sync/outbox schemas
    geo/                 # haversine, insideZone, accuracy rules (API + mobile)
    tokens/              # design tokens JSON → web Tailwind + NativeWind
    i18n/                # shared en/ar; mobile adds app.* namespace
```

## Mobile stack

| Concern | Choice |
|---|---|
| Framework | Expo (latest stable) + React Native + TypeScript + Expo Router |
| Native | Development build (`expo-dev-client`), not Expo Go (MapLibre + background location) |
| Styling | NativeWind + `packages/tokens` |
| Local DB | `expo-sqlite` + Drizzle; UI reads SQLite for offline entities |
| Online reads | TanStack Query (team map, alerts paging) |
| UI state | Zustand (session, clock UI, connectivity) |
| Secure storage | `expo-secure-store` + `expo-local-authentication` |
| Location | `expo-location` + `expo-task-manager` |
| Maps | `@maplibre/maplibre-react-native` + OfflineManager |
| Sync trigger | `@react-native-community/netinfo` + `expo-background-task` |
| Push | `expo-notifications` |
| i18n | `i18next` + `expo-localization`; RTL via `I18nManager` + reload |
| Errors | Sentry (`@sentry/react-native`) |
| Builds | EAS Build / Submit / Update (`dev`, `staging`, `production`) |

Bundle id: `com.xaeon.elevora`. Scheme: `elevora://`.

## Sync overview

```
UI ─reads─> SQLite (entities)
UI ─writes─> SQLite + outbox (one transaction)
outbox worker ──POST /v1/mobile/sync/push──> Fastify services → Postgres
pull worker  ──GET  /v1/mobile/sync/pull──> upserts + deletes + cursor
location task ─> SQLite points ─POST /v1/mobile/locations/batch─> location store + WS
```

Rules:

- Every write is a client UUID event (idempotent via `client_events` / existing `clientEventId` patterns).
- Aggregate ordering: e.g. `clock:{userId}`, `task:{id}`.
- Server time is official when online; offline events store `occurredAt` + `receivedAt` + `source = mobile_offline`.
- Conflicts (`baseVersion` mismatch) surface in Sync center: Keep web / Re-apply mine.

## Entitlements (tabs)

Server returns entitlements on `GET /v1/mobile/me` (or enriched `/auth/me`). App never invents gating.

| Surface | Gate |
|---|---|
| Today, History, Alerts, Profile | Always |
| Map tab + background tracking | Field-ops pack / live map module |
| Leave tab | Leave module + plan |
| Tasks tab | Tasks module + plan |
| Manager Team / approvals | Manager of reports or system module role (`leaves` / `tasks`) |

If a module is off, hide its tab (4-tab bar when needed).

## Presence modes

From employee record (not a Zone table):

- `fixed_zone` — geofence required for clock-in; OS geofencing for enter/exit while on shift.
- `mobile` — no geofence for clock-in; continuous background location while on shift (field-ops).

`Me.zones` is derived from the employee geofence columns (+ upcoming shift context if any).

## Web vs mobile offline

Web has a thin clock queue in `apps/web/src/lib/offline-queue.ts` (`clientEventId`, lat/lng). Mobile outbox is richer (all domains) but clock event ids should remain compatible with attendance `clientEventId`.
