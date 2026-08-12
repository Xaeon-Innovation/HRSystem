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
| GET/POST | `/v1/plans` | Catalog; POST may sync Paymob |
| PATCH | `/v1/plans/:id` | Activate / sync Paymob |
| GET | `/v1/subscriptions` | Cross-tenant list |
| PATCH | `/v1/subscriptions/:id` | Manual override / cancel |
| GET | `/v1/audits` | Filters: `tenantId`, `actorUserId`, `action`, `from`, `to`, `limit`, `offset` |

## Billing (tenant_admin)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/v1/billing/current` | Plan, seats, available plans |
| POST | `/v1/billing/checkout` | `{ planId }` → Paymob checkout URL |
| POST | `/v1/billing/cancel` | Cancel at period end |

## Webhooks

| Method | Path | Notes |
|--------|------|-------|
| POST | `/v1/webhooks/paymob` | HMAC-verified; no JWT |

See [BILLING.md](./BILLING.md).

## Employees (tenant scoped)

| Method | Path |
|--------|------|
| GET | `/v1/employees` |
| POST | `/v1/employees` |
| POST | `/v1/employees/import` |
| GET | `/v1/employees/:id` |
| PATCH | `/v1/employees/:id` |

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
| GET | `/v1/admin/location-history` | `employeeId`, `from`, `to` (ISO). Max range 24h. Returns retained pings |
| GET | `/v1/admin/location-sessions` | `employeeId`, `date=YYYY-MM-DD`. Attendance intervals for History presets |
| GET | `/v1/admin/dashboard` | Aggregates |
| GET | `/v1/admin/health-metrics` | Health counters |

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
