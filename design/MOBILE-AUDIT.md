# Polara Field — Phase 0 mobile audit

Read-only audit of the live monorepo for building `/v1/mobile/*` and `apps/mobile`.  
Master plan adapter: [`ELEVORA-MOBILE-APP-PLAN.md`](./ELEVORA-MOBILE-APP-PLAN.md).  
Tickets: [`docs/mobile/TICKETS.md`](../docs/mobile/TICKETS.md).

**Audited:** Fastify `apps/api`, `@hr/db`, `@hr/shared`, Next.js `apps/web` client.  
**Not audited for change:** no code was modified in this pass.  
**Cross-check:** findings from a parallel codebase explore pass were merged into §§1–2, 2.4, 2.8, 9, and 9b (clock-out idempotency, ignored `clientTimestamp`, in-memory left-zone streak, admin-only live map, weak-reuse table).

---

## 1. Auth and session

| Piece | Location | Notes |
|---|---|---|
| Login | [`apps/api/src/routes/auth.ts`](../apps/api/src/routes/auth.ts) `POST /v1/auth/login` | Body: `loginSchema` (`email`, `password`, optional `tenantSlug`). Rate limit 20/min. Login lockout via [`login-guard.ts`](../apps/api/src/lib/login-guard.js). Suspended/missing tenant → invalid credentials. |
| Refresh | same file `POST /v1/auth/refresh` | JWT refresh signed with `JWT_REFRESH_SECRET` via [`auth-tokens.ts`](../apps/api/src/lib/auth-tokens.ts). **Not opaque, not rotating, not device-bound.** Reuse of an old refresh still works until expiry (~7 days). |
| Me | `GET /v1/auth/me` | Returns auth user + subscription/features for tenant. |
| JWT claims | `@hr/shared` `JwtPayload` | `sub`, `role`, `tenantId`, `employeeId`, `systemModuleRoles`, optional `workspaceMode` / `previewPlanId`. Access TTL 15m. |
| Guards | [`apps/api/src/types.ts`](../apps/api/src/types.ts) | `authenticate`, `requireRoles`, `requireModuleRole`, `requireTenantScope`. |
| Features | [`apps/api/src/lib/features.ts`](../apps/api/src/lib/features.ts) | `getTenantPlanFeatures`, `requirePlanFeature`, launch filter (draft/lab/ga). |
| Web session | [`apps/web/src/lib/api.ts`](../apps/web/src/lib/api.ts) | `sessionStorage` access + refresh tokens; refresh on 401. Soft UI gate: `feature-gate.tsx`. |

**Gaps for mobile auth (M2b):**

- No `POST /auth/workspace` public branding-by-slug (tenant lookup is only inside login). Closest existing: authenticated [`routes/branding.ts`](../apps/api/src/routes/branding.ts) (`/v1/admin/branding`) — not usable pre-login.
- No `mustChangePassword` / forced password change flag on users.
- No `mobile_devices` / `mobile_refresh_tokens` tables; no theft detection via refresh reuse. Refresh TTL today is **7 days** (plan asked for ~60d rotating opaque).
- No logout/revoke endpoint that invalidates refresh.
- Web refresh must stay JWT-based; mobile can add a parallel opaque rotating path under `/v1/mobile/auth/*`.
- Avatar write: `POST`/`DELETE` `/v1/auth/me/avatar` (base64) — separate from public GET `/v1/uploads/avatars/:userId`.

---

## 2. Business logic by domain

### 2.1 Clock / attendance

| Concern | Where |
|---|---|
| Routes | [`apps/api/src/routes/attendance.ts`](../apps/api/src/routes/attendance.ts) — `POST /v1/attendance/clock-in`, `clock-out`, list/history, corrections |
| Idempotency | `clientEventId` on `attendance_records` (unique per tenant). **Clock-in** dedupes and returns `{ attendance, deduped: true }`. **Clock-out** accepts `clientEventId` only as ping `clientPingId` — **no attendance-level dedupe**. |
| Geofence | Local `assertWithinGeofence` in attendance route → [`isInsideGeofence`](../apps/api/src/lib/geo.ts). Skips if `presenceMode === 'mobile'` or geofence columns null. |
| Shift gate | `assertCanClockIn` / `onClockInLinked` / `onClockOutLinked` from [`services/shifts.ts`](../apps/api/src/services/shifts.ts) |
| Live location side effects | Upserts `employee_live_locations`, inserts `location_pings`, `broadcastToTenant` `location.update` when liveMap or geofence compliance |
| Time authority | Always `new Date()` server time on clock-in/out — **no offline `occurredAt` / `source` / `device_id` / `received_at` columns today**. Schema accepts optional `clientTimestamp` but **never applies it**. |
| Accuracy / mock | **Not checked** — only lat/lng from `clockEventSchema` |
| Web offline queue | [`apps/web/src/lib/offline-queue.ts`](../apps/web/src/lib/offline-queue.ts) — `clock-in` \| `clock-out` + `clientEventId` + lat/lng + `clientTimestamp` (clientTimestamp not applied server-side). Clock-only — no breaks/leave/tasks. |

### 2.2 Geo

[`apps/api/src/lib/geo.ts`](../apps/api/src/lib/geo.ts):

- `distanceMeters(a, b)` — haversine.
- `isInsideGeofence(point, zone)` — `distance <= radiusMeters` only.

**Gap:** product plan wants strict rule `distance + min(accuracy, 50) <= radius` and mock/accuracy rejects. Extract to `packages/geo` and adopt carefully (M1a / M2c) so web and mobile share one rule.

### 2.3 Presence and zones

- Enum `presence_mode`: `fixed_zone` \| `mobile` on `employees` ([schema](../packages/db/src/schema.ts)).
- Zone = employee columns `geofenceLat`, `geofenceLng`, `geofenceRadiusMeters` — **no Zone table**.
- Sites/branches may have lat/lng but are org structure, not clock geofences.
- Places search: [`routes/places.ts`](../apps/api/src/routes/places.ts) (Nominatim).

### 2.4 Shifts, breaks, overtime, left-zone

| Concern | Where |
|---|---|
| Service | [`apps/api/src/services/shifts.ts`](../apps/api/src/services/shifts.ts) — well-extracted already |
| Routes | [`apps/api/src/routes/shifts.ts`](../apps/api/src/routes/shifts.ts) — patterns, instances, `POST .../overtime`, break-policies, `POST /breaks/start`, `/breaks/end`, left-zone resolve |
| Key exports | `materializeShiftPatterns`, `getTodayShiftForEmployee`, `startBreak`, `endBreak`, `respondOvertime`, `handleComplianceLocationPing`, `assertCanClockIn`, `onClockInLinked`, `onClockOutLinked`, `runShiftComplianceJobs`, `isValidActiveBreak`, `autoClockOutLeftZone` |
| Jobs | [`apps/api/src/jobs.ts`](../apps/api/src/jobs.ts) calls shift compliance |

Compliance location pings create left-zone incidents / auto clock-out; break-open suppresses incidents (product rule already in service).

**Ops risk:** outside-ping streak for left-zone auto clock-out uses **in-memory** `outsidePingCounts` in `services/shifts.ts` — unsafe across multiple API instances. M2a/M6 should note durable counter (DB or Redis) before relying on it in production mobile tracking.

`GET /v1/shifts/today` shape (reuse for Today screen): `{ instance, pendingLeftZoneIncident, activeBreak, breakPolicy, graceMinutes, timezone }`.

### 2.5 Leave

| Concern | Where |
|---|---|
| Service | [`apps/api/src/services/leave.ts`](../apps/api/src/services/leave.ts) — load/save snapshot, accrual, reminders, notifications |
| Domain math | [`packages/shared/src/leave/*`](../packages/shared/src/leave) |
| Persistence | `leave_states` JSON snapshot per tenant (`types`, `policies`, `balances`, `transactions`, `requests`, …) + `updatedAt` — **no per-request version column** |
| Routes | [`apps/api/src/routes/leave.ts`](../apps/api/src/routes/leave.ts) |
| Web mirror | `apps/web/src/lib/leave/*` — do **not** use for mobile; prefer `@hr/shared` + API service |

### 2.6 Tasks

| Concern | Where |
|---|---|
| Service | [`apps/api/src/services/tasks.ts`](../apps/api/src/services/tasks.ts) — create, list, detail, start, complete, submitForReview, review, deliverables, attachments |
| Routes | [`apps/api/src/routes/tasks.ts`](../apps/api/src/routes/tasks.ts) |
| Schema | `tasks` (+ assignees, attachments with `data_url`/`url`, deliverable requirements/submissions, activity). Has `updatedAt`, **no optimistic-concurrency `version` column** |

**Gap for conflicts:** mobile plan’s `baseVersion` needs either a new `tasks.version` (and bump on write) or conflict detection via `updatedAt` ISO comparison — prefer adding `version` in M2a/M2c.

### 2.7 Notifications

| Concern | Where |
|---|---|
| Create | [`apps/api/src/services/notifications.ts`](../apps/api/src/services/notifications.ts) `createNotification` — inserts row, emails if configured; if `FCM_SERVER_KEY` set marks `queued` else `delivered_local`. **No actual FCM/Expo send implementation.** |
| Routes | [`apps/api/src/routes/notifications.ts`](../apps/api/src/routes/notifications.ts) |
| Web Push table | `push_subscriptions` (endpoint + p256dh/auth) — browser Web Push, not Expo |
| Alert rules | [`services/alert-rules.ts`](../apps/api/src/services/alert-rules.ts) |

**Gap:** Expo push adapter + device tokens on `mobile_devices` (M2b/M9).

### 2.8 Live map and locations

| Concern | Where |
|---|---|
| REST | [`apps/api/src/routes/live-map.ts`](../apps/api/src/routes/live-map.ts) under `/v1/admin` — `requireRoles("tenant_admin")` + `liveMap` |
| Team today | [`apps/api/src/routes/team-today.ts`](../apps/api/src/routes/team-today.ts) — closer shape for mobile Team today / presence |
| WS | [`apps/api/src/ws.ts`](../apps/api/src/ws.ts) + [`ws-hub.ts`](../apps/api/src/ws-hub.ts) — `GET /ws` |
| WS auth | First message `{ type: "auth", token: <access JWT> }` within 5s; then `location.ping` (requires open attendance) or `subscribe.map` (tenant_admin + `liveMap` feature) |
| Broadcast | `location.update` to room `tenant:{id}:map` |
| Web client | [`apps/web/src/hooks/use-location-stream.ts`](../apps/web/src/hooks/use-location-stream.ts) |
| Tables | `location_pings` (`clientPingId`), `employee_live_locations` |
| Ping schema | `locationPingSchema`: lat/lng + optional `recordedAt` / `clientPingId` — **no** accuracy/speed/heading/mocked |

**Gaps:** (1) No REST location write for field workers (WS-only) and no `POST /locations/batch`. (2) Managers who are not `tenant_admin` (direct managers) cannot `subscribe.map` today — Team map needs product decision in M2d/M7. (3) Short-lived `/v1/mobile/realtime/token` can mint a normal access JWT or a scoped WS token.

### 2.9 Entitlements

- Plan modules: `@hr/shared` `modules.ts` / `plan-features.ts` — keys include `liveMap`, `teamToday`, `leave`, `tasks`, etc.
- Runtime: `getTenantPlanFeatures` + tenant settings overrides + launch status.
- System module roles on `users.systemModuleRoles` (`leaves`, `hiring`, …) for employee module grants.
- Soft web gate: `apps/web/src/lib/feature-gate.tsx`, `permissions.ts`.

Mobile `Me.entitlements` should mirror this resolution (M2d).

---

## 3. Schema highlights (mobile-relevant)

Source: [`packages/db/src/schema.ts`](../packages/db/src/schema.ts).

| Entity | Table | Sync-friendly columns | Notes |
|---|---|---|---|
| User | `users` | `updatedAt` | No mustChangePassword |
| Employee | `employees` | `updatedAt`, presence + geofence cols, `managerId` | Zone derived here |
| Attendance | `attendance_records` | `updatedAt`, `clientEventId`, `anomalyFlags` | Need `source`, offline timestamps for mobile |
| Corrections | `attendance_corrections` | — | Admin path |
| Pings | `location_pings` | `recordedAt`, `clientPingId` | No accuracy/speed/heading/mocked cols |
| Live | `employee_live_locations` | `updatedAt`, `isClockedIn` | |
| Notifications | `notifications` | `createdAt`, `read`, metadata | No `updatedAt` |
| Leave | `leave_states` | `updatedAt` on whole snapshot | Sync strategy = snapshot pull or extract entities |
| Tasks | `tasks` + children | `updatedAt` | Add `version` for conflicts |
| Shifts | `shift_patterns`, `shift_instances`, `break_policies`, `break_sessions`, `left_zone_incidents` | mostly `updatedAt` | OT fields on instances |
| Push (web) | `push_subscriptions` | — | Not Expo |
| **Missing** | `mobile_devices`, `mobile_refresh_tokens`, `client_events` | — | Required by mobile plan |

---

## 4. File storage

- Avatars/logos: base64 on `users` / `tenants`, served by [`routes/uploads.ts`](../apps/api/src/routes/uploads.ts) `GET /v1/uploads/avatars/:userId`, `.../logos/:tenantId`.
- Task attachments / deliverables: `data_url` or external `url` columns — written via task service.
- **No S3 / presign / object store.**

Mobile v1 should POST upload bytes (or data URLs within body limit — API `bodyLimit` is 4MB) and return `uploadId` referencing stored rows — not invent S3.

---

## 5. WebSocket authentication (summary)

1. Client connects to `GET /ws`.
2. Must send `{ type: "auth", token }` (access JWT) within 5 seconds or socket closes.
3. Server `app.jwt.verify`; requires `tenantId` unless `super_admin`.
4. Employees send `location.ping` while clocked in.
5. `tenant_admin` can `subscribe.map` if plan has `liveMap`.
6. Server may auto-attach admin to map room on auth.

Mobile can reuse this with a short-lived access token from `/v1/mobile/realtime/token`.

---

## 6. Proposed service extractions (M2a)

Already in services (prefer reuse, don’t re-extract):

- `services/shifts.ts` — breaks, OT, compliance, clock linkage
- `services/leave.ts` + `@hr/shared` leave
- `services/tasks.ts`
- `services/notifications.ts` (extend for Expo later)

**Extract from route handlers (priority order):**

1. **`services/attendance.ts`** (high)  
   From `routes/attendance.ts`: `assertWithinGeofence`, clock-in/out transaction (idempotent clientEventId), live-location + ping + broadcast side effects, correction helpers. Routes become thin wrappers. Mobile sync push calls the same functions.

2. **`packages/geo`** (high, ticket M1a)  
   Move `distanceMeters` / `isInsideGeofence`; add accuracy-aware `insideZone`. Re-export from `apps/api/src/lib/geo.ts` during migration.

3. **`services/mobile-sync.ts`** (M2c, new)  
   Pull cursor assembly, push event dispatcher → attendance/shifts/leave/tasks/notifications. Not an extraction of existing behavior; new orchestration.

4. **`services/mobile-auth.ts`** (M2b, new)  
   Workspace lookup, device session, opaque refresh rotation. Keep `auth-tokens.ts` for web JWT refresh.

5. **Optional:** enrich `createNotification` with a push adapter hook (M9) without changing email behavior.

**Defer:** leave snapshot → relational sync entities can be a pull-time projection first (serialize requests/balances from snapshot) without a big leave schema rewrite.

---

## 7. Reuse vs add for `/v1/mobile`

### Reuse as-is (call services or existing routes from mobile handlers)

| Capability | Existing |
|---|---|
| Clock in/out core | Attendance + shifts services (after extract) |
| Breaks / overtime | `POST /v1/shifts/breaks/*`, `.../overtime` logic in `respondOvertime` |
| Leave CRUD/decide | Leave service |
| Tasks lifecycle | Tasks service |
| Team today data | `team-today` route logic |
| Live map WS | `/ws` + hub |
| Plan features | `getTenantPlanFeatures` |
| Avatars/logos read | `/v1/uploads/*` |

### Must add (additive)

| Capability | Why |
|---|---|
| `/v1/mobile/auth/workspace` | Branding before login |
| `/v1/mobile/auth/login|refresh|logout|change-password` | Device-bound rotating refresh |
| Tables `mobile_devices`, `mobile_refresh_tokens`, `client_events` | Sessions + idempotent outbox |
| `/v1/mobile/me` | Entitlements + presence + zones + managerOf in one contract |
| `/v1/mobile/sync/pull|push` | Offline entity sync |
| `/v1/mobile/locations/batch` | Bulk pings (gzip); extend ping schema for accuracy/mocked if needed |
| `/v1/mobile/uploads` | Leave/task file upload → `uploadId` |
| `/v1/mobile/map/regions` | Offline pack suggestions |
| `/v1/mobile/realtime/token` | Convenience for WS |
| Attendance columns for offline | `source`, `occurred_at` vs server, `received_at`, `device_id`, `time_suspect` (or encode in `anomalyFlags`) |
| Task `version` | Conflict detection |
| Expo push send path | Beyond email / FCM stub |
| Accuracy-aware geo | Product rule vs current `distance <= radius` |
| Forced password change | If product requires; **not in schema today** — confirm with product or implement additive flag |

### Do not fork

- Leave validation math (`@hr/shared`)
- Shift compliance / left-zone / OT grace (`services/shifts.ts`)
- Plan gating (`features.ts`)

---

## 8. Web offline queue alignment

Web queue shape:

```ts
{ type: "clock-in" | "clock-out", lat, lng, clientEventId, clientTimestamp }
```

Mobile outbox will use richer event types (`clock.in`, …). Map mobile clock events onto the same `clientEventId` uniqueness on `attendance_records` so web and mobile retries never double-create. Prefer storing mobile event id == attendance `clientEventId` for clock.in (and a separate id scheme for clock.out if needed — today clock-out does not appear to dedupe on `clientEventId`; verify in M2a extract and add if missing).

---

## 9. Prioritized extraction checklist (for M2a)

1. [x] Create `apps/api/src/services/attendance.ts` with clock-in/out + geofence assert + live map side effects; thin the route.
2. [x] Add clock-out `clientEventId` dedupe if absent (behavior-compatible: only when id provided).
3. [x] Extract shared `recordLocationPing` (WS + attendance side effects) toward `services/location.ts` for future batch endpoint.
4. [x] Re-export geo from `@hr/geo` without changing inequality (`isInsideGeofence` still lenient).
5. [x] Add `tasks.version` default 1 + bump in task mutators (additive column).
6. [ ] Document leave sync projection approach (snapshot → entity DTOs) for M2c — no leave schema rewrite in M2a unless trivial.
7. [x] Flag left-zone `outsidePingCounts` in-memory risk for a follow-up hardening ticket (not necessarily M2a).
8. [x] Keep all existing API tests green.

---

## 9b. Weak reuse (harden before relying on it in mobile)

| Item | Issue |
|---|---|
| `clientTimestamp` | Accepted on clock events, ignored — offline timestamps broken until M2c |
| Left-zone streak | In-process memory — wrong under multi-instance API |
| Notification “queued” | `FCM_SERVER_KEY` only flips status; no FCM/Expo sender |
| Leave/task `dataUrl` attachments | Large JSON payloads — poor for sync; mobile upload endpoint should store once and reference `uploadId` |
| `/auth/me` | Missing `presenceMode`, zones, `managerOf` — need `/v1/mobile/me` or extend carefully |

---

## 10. References

- API contract doc: [`docs/API.md`](../docs/API.md)
- Mobile specs: [`docs/mobile/`](../docs/mobile/)
- Prototype: [`design/elevora-mobile-prototype/`](./elevora-mobile-prototype/)
