# 01 — Mobile API surface

All routes on Fastify [`apps/api`](../../../apps/api), prefix **`/v1/mobile`**. Auth: `Authorization: Bearer <accessToken>` except workspace lookup.

Do not break existing `/v1/*` used by the web. Additive only. Validate I/O with Zod in `@hr/shared`.

See [`design/MOBILE-AUDIT.md`](../../../design/MOBILE-AUDIT.md) for what already exists vs what to add.

## Auth

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/mobile/auth/workspace` | Public. `{ slug }` → tenant name, logo, accent, sign-in methods, status. Rate limited |
| POST | `/v1/mobile/auth/login` | `{ slug, email, password, device }` → access (JWT ~15m), refresh (opaque/rotating), `mustChangePassword`, `me` |
| POST | `/v1/mobile/auth/refresh` | `{ refreshToken, deviceId }` — rotate; reuse of old token revokes device session |
| POST | `/v1/mobile/auth/change-password` | Forced first change |
| POST | `/v1/mobile/auth/logout` | Revoke device session |

New tables (additive): `mobile_devices`, `mobile_refresh_tokens` (hash, device_id, expires_at, replaced_by). Web JWT refresh path stays as-is.

## Profile and sync

| Method | Path | Purpose |
|---|---|---|
| GET | `/v1/mobile/me` | `Me` contract: user, tenant, role, moduleRoles, presenceMode, zones, entitlements, locale, theme, managerOf |
| GET | `/v1/mobile/sync/pull?cursor=&scopes=` | `{ changes, cursor, serverTime }` — upserts/deletes by entity |
| POST | `/v1/mobile/sync/push` | `{ events: BaseEvent[] }` max 100 → per-event `PushResult` |
| POST | `/v1/mobile/locations/batch` | gzip, max 500 points → same store as live map + WS broadcast |
| POST | `/v1/mobile/uploads` | Purpose `leave-attachment` \| `task-deliverable`; v1 matches existing storage (data_url / upload routes), returns `uploadId` |
| GET | `/v1/mobile/team/presence` | Managers — Team today / direct reports |
| GET | `/v1/mobile/map/regions` | Suggested offline pack bounds + style URLs |
| GET | `/v1/mobile/realtime/token` | Short-lived token to join existing `/ws` live map |

### First pull window (no cursor)

Shift instances −7…+14 days, patterns, break/OT policies, zones (from employee), leave types/balances, last 90 days leave ledger/requests, open + 30 days closed tasks, 60 days notifications, 30 days clock sessions. Managers: approvals queue + team presence snapshot.

## Outbox event types

Discriminated union on `type` (see master plan §4.1). Base fields: `id` (uuid), `occurredAt`, `deviceUptimeMs`, `capturedOffline`, optional `location`, optional `baseVersion`.

Clock: `clock.in` \| `clock.out` \| `break.start` \| `break.end` \| `overtime.stay` \| `overtime.decline`  
Zone: `zone.exit` \| `zone.enter`  
Leave: `leave.create` \| `leave.cancel` \| `leave.resubmit` \| `leave.decide`  
Task: `task.status` \| `task.comment` \| `task.deliverable.link` \| `task.deliverable.file` \| `task.review`  
Notify: `notification.read` \| `notification.readAll`

`PushResult`: `{ id, status: 'applied' | 'duplicate' | 'rejected' | 'conflict', reason?, serverRecord?, serverTime }`.

Idempotency: `client_events` table (event id PK) stores result; replay returns stored result. Align clock events with existing `attendance_records.client_event_id` where applicable.

## Server rules (summary)

- **Clock time:** online → server timestamp; offline → `occurredAt` + flag; reject `too_old` (default 72h); `time_suspect` if uptime vs wall clock disagree > 2 min.
- **Geofence:** re-validate fixed-zone clock-in via `packages/geo` (shared with API). Reject `outside_zone`, `low_accuracy`, `mocked_location`. Mobile presence skips geofence.
- **Ordering:** clock events per user by `occurredAt`. Orphan `clock.out` → admin correction alert.
- **Breaks:** `zone.exit` during open break → no left-zone incident (existing product rule).
- **Overtime:** grace logic same as web/API; auto clock-out if no decision.
- **Leave / tasks:** same validation as existing services; task conflicts return `conflict` + `serverRecord`.
- **Push:** when notification service creates a row, also push to active mobile devices with `{ type, entityId, deepLink }`.

## Small web-side additions (later tickets)

- Offline / time-suspect chips on attendance sessions.
- Read-only Devices list on employee drawer.
- Rejected/too-old offline events → admin alerts.
