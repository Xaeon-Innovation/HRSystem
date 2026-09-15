# API Contract (`/v1`)

Base URL: `http://localhost:4000`

Auth: `Authorization: Bearer <accessToken>`  
JWT claims: `sub`, `role`, `tenantId`, `employeeId`

## Auth

| Method | Path | Notes |
|--------|------|-------|
| POST | `/v1/auth/login` | `{ email, password, tenantSlug? }` |
| POST | `/v1/auth/refresh` | `{ refreshToken }` |
| GET | `/v1/auth/me` | Current user |

## Tenants (super_admin)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/tenants` | Includes subscription + seat summary |
| GET | `/v1/tenants/:id` | Detail + settings + seats |
| POST | `/v1/tenants` | Creates tenant + trial subscription |
| PATCH | `/v1/tenants/:id` | |
| DELETE | `/v1/tenants/:id` | Soft delete |

## Plans / subscriptions / audits (super_admin)

| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/v1/plans` | Catalog; POST may sync Polar (`syncPolar`) |
| POST | `/v1/plans/sync-polar` | Idempotent create Polar products for Field/People/Ops/Scale |
| PATCH | `/v1/plans/:id` | Activate / sync Polar |
| GET | `/v1/subscriptions` | Cross-tenant list |
| PATCH | `/v1/subscriptions/:id` | Manual override / cancel |
| GET | `/v1/audits` | Filters: `tenantId`, `actorUserId`, `action`, `from`, `to`, `limit`, `offset` |

Public catalog: `GET /v1/public/plans` (active plans only). Self-serve SKUs are **Field / People / Ops / Scale**; **Enterprise** is sales-only (`amountCents = 0`). Feature packs on `plans.features`: `fieldOps`, `peopleOps`, `analytics`, `integrations`, plus numeric `pingIntervalSec` / `locationRetentionDays` caps. See [BILLING.md](./BILLING.md).

## Billing (tenant_admin)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/billing/current` | Plan, seats, seat quotes, available plans |
| POST | `/v1/billing/checkout` | `{ planId, seats? }` → Polar checkout URL |
| POST | `/v1/billing/seats` | `{ seats }` → resize Ops/Scale (Polar proration) |
| POST | `/v1/billing/portal` | Polar customer portal URL |
| POST | `/v1/billing/cancel` | Cancel at period end |

## Webhooks

| Method | Path | Notes |
|--------|------|-------|
| POST | `/v1/webhooks/polar` | Standard Webhooks signature; no JWT |
| POST | `/v1/webhooks/paymob` | Legacy; unused on live path |
| POST | `/v1/webhooks/integrations/:connectionId` | Tenant connection HMAC; stores raw events then canonicalizes |

See [BILLING.md](./BILLING.md).

## Branches / sites (tenant scoped)

| Method | Path | Notes |
|--------|------|-------|
| GET/POST | `/v1/branches` | tenant_admin write |
| PATCH/DELETE | `/v1/branches/:id` | |
| GET/POST | `/v1/sites` | Optional `branchId` query on GET |
| PATCH/DELETE | `/v1/sites/:id` | |

## Integrations (tenant_admin, plan feature `integrations`)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/integrations/catalog` | Providers + canonical field lists |
| GET/POST | `/v1/integrations/connections` | Secrets encrypted at rest; never returned |
| GET/PATCH | `/v1/integrations/connections/:id` | |
| POST | `/v1/integrations/connections/:id/test` | SSRF-safe REST probe |
| POST | `/v1/integrations/connections/:id/sync` | Poll + transform |
| GET | `/v1/integrations/connections/:id/sync-runs` | |
| GET/POST | `/v1/integrations/connections/:id/mappings` | POST replaces mapping set |
| GET | `/v1/integrations/connections/:id/raw-events` | |
| POST | `/v1/integrations/connections/:id/replay` | Dead-letter → pending |
| POST | `/v1/integrations/connections/:id/csv/preview` | |
| POST | `/v1/integrations/connections/:id/csv/import` | |
| GET | `/v1/integrations/connections/:id/links` | External employee/branch links |
| POST | `/v1/integrations/links/employees` | Manual identity link |
| POST | `/v1/integrations/links/branches` | |

## Analytics (plan feature `analytics`)

Dashboards read **summary / canonical tables**, never raw payloads. Employees may only query their own `/employees/:id` and `/timeline`.

| Method | Path |
|--------|------|
| GET | `/v1/analytics/summary` |
| GET | `/v1/analytics/attendance` |
| GET | `/v1/analytics/productivity` |
| GET | `/v1/analytics/field-ops` |
| GET | `/v1/analytics/business-output` |
| GET | `/v1/analytics/branches/:branchId` |
| GET | `/v1/analytics/employees/:employeeId` |
| GET | `/v1/analytics/alerts` |
| PATCH | `/v1/analytics/alerts/:id` |
| GET | `/v1/analytics/drilldown` |
| GET | `/v1/analytics/timeline` |
| GET | `/v1/analytics/correlation` |

Query filters: `from`, `to` (`YYYY-MM-DD`), optional `branchId`.

Attendance rate = clocked-in / active employees (no roster). Labor cost uses tenant setting `defaultHourlyCost`.

## Employees (tenant scoped)

| Method | Path |
|--------|------|
| GET | `/v1/employees` |
| POST | `/v1/employees` |
| POST | `/v1/employees/import` |
| GET | `/v1/employees/:id` |
| PATCH | `/v1/employees/:id` |
| GET | `/v1/employees/:id/credentials` | tenant_admin. `{ email, password }`, password is null if none is stored yet |
| POST | `/v1/employees/:id/password` | tenant_admin. `{ password }` (min 8). Returns `{ email, password }` |

## Attendance

| Method | Path |
|--------|------|
| POST | `/v1/attendance/clock-in` |
| POST | `/v1/attendance/clock-out` |
| GET | `/v1/attendance/status` |
| GET | `/v1/attendance/history` |
| GET | `/v1/attendance/open` |
| PATCH | `/v1/attendance/:id/correct` |

## Live map

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/admin/live-map` | REST fallback. Field `employee` role only. Query: `presence=on_shift\|last_seen\|all` (default `all`), optional `q`, `status` |
| GET | `/v1/admin/map-settings` | Map appearance for the tenant (tiles, marker style, colors, initials) |
| PATCH | `/v1/admin/map-settings` | Partial update: `tileStyle`, `markerStyle`, `onShiftColor`, `lastSeenColor`, `trailColor`, `showInitials` |
| GET | `/v1/admin/location-history` | `employeeId`, `from`, `to` (ISO). Max range 24h. Returns retained pings |
| GET | `/v1/admin/location-sessions` | `employeeId`, `date=YYYY-MM-DD`. Attendance intervals for History presets |
| GET | `/v1/admin/dashboard` | Aggregates |
| GET | `/v1/admin/health-metrics` | Health counters |

## Branding (tenant_admin)

Stored on `tenants.settings` (`brandingName`, `logoUrl`, `brandPreset`).

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/admin/branding` | `{ branding: { brandingName, logoUrl, brandPreset } }` |
| PATCH | `/v1/admin/branding` | Partial: `brandingName`, `logoUrl` (URL or `""`/`null` to clear), `brandPreset` (`neutral`\|`teal`\|`forest`\|`slate`) |

## Leave

Tenant-scoped leave store (persisted JSON). GET returns a role-filtered snapshot; mutations are request/policy endpoints (not a full PUT replace).

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/leave` | `{ leave }` snapshot for the actor |
| POST | `/v1/leave/requests` | Submit / draft leave request |
| POST | `/v1/leave/requests/:id/resubmit` | Resubmit with body |
| POST | `/v1/leave/requests/:id/decide` | Approve / reject (module role) |
| POST | `/v1/leave/requests/bulk-decide` | Bulk decide |
| POST | `/v1/leave/requests/:id/cancel` | Cancel |
| POST | `/v1/leave/requests/:id/comments` | Comment |
| PATCH | `/v1/leave/requests/:id/hr-note` | HR note |
| POST | `/v1/leave/balances/adjust` | Adjust balance |
| PATCH | `/v1/leave/types/:id` | Update leave type |
| PATCH | `/v1/leave/policies/:id` | Update policy |
| POST | `/v1/leave/accrual` | Run accrual |

## Hiring

Persisted JSON module (`jobs` + `candidates` arrays). Requires hiring module role.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/hiring` | `{ hiring }` snapshot |
| PUT | `/v1/hiring` | Replace snapshot (`{ jobs, candidates }` or `{ snapshot: { … } }`) |

## Compensation

Persisted JSON module (`records` required; `requests` optional). Requires compensation module role.

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/compensation` | `{ compensation }` snapshot |
| PUT | `/v1/compensation` | Replace snapshot (`{ records, … }` or `{ snapshot: { … } }`) |

## KPIs

| Method | Path |
|--------|------|
| GET/POST | `/v1/kpis` |
| POST | `/v1/kpis/:id/clone` |
| POST | `/v1/kpis/assign` |
| POST | `/v1/kpis/scores` |
| GET | `/v1/kpis/summary` |

## Notifications

| Method | Path |
|--------|------|
| GET | `/v1/notifications` |
| POST | `/v1/notifications/:id/read` |
| POST | `/v1/notifications/read-all` |
| POST | `/v1/notifications/announce` |
| POST | `/v1/notifications/push-subscribe` |

## WebSocket `GET /ws?token=...`

Client → server:

```json
{ "type": "location.ping", "payload": { "lat": 30.04, "lng": 31.23, "recordedAt": "...", "clientPingId": "..." } }
{ "type": "subscribe.map" }
{ "type": "ping" }
```

Server → admin map room `tenant:{id}:map`:

```json
{ "type": "location.update", "payload": { "employeeId": "...", "lat": 0, "lng": 0, "updatedAt": "...", "isClockedIn": true } }
{ "type": "location.update", "payload": { "employeeId": "...", "lat": 0, "lng": 0, "updatedAt": "...", "isClockedIn": false } }
```

`isClockedIn: false` means last-seen / clocked-out; keep the pin, do not remove it. Clock-in and clock-out also insert into `location_pings` and broadcast the same event.

### Location history response

```json
{
  "employee": { "id": "...", "name": "Ahmed", "jobTitle": "Coordinator" },
  "from": "...",
  "to": "...",
  "points": [{ "lat": 0, "lng": 0, "recordedAt": "..." }],
  "pointCount": 12,
  "retentionDays": 60
}
```

### Location sessions response

```json
{
  "employeeId": "...",
  "date": "2026-08-12",
  "sessions": [{ "id": "...", "clockInAt": "...", "clockOutAt": "..." }]
}
```

All queries and WS rooms are scoped by `tenant_id`. Cross-tenant leakage is a release blocker.
