# Polara Field mobile app: plan for Cursor

Build a native iOS and Android app for Polara employees and their managers. It covers clock in and out with geofencing, background tracking during shifts, offline maps, shifts, leave and tasks. It stays in sync with the existing Polara web app (Next.js) and uses the same tenants, users, permissions, plans and data.

The visual source of truth is the screen prototype in `/design/elevora-mobile-prototype/` (open `index.html`, then use "All screens" or "Interactive"). It uses the same tokens as the web redesign.

**Agent entrypoint (prefer over re-reading this whole file):** [`docs/mobile/TICKETS.md`](../docs/mobile/TICKETS.md) + specs in [`docs/mobile/`](../docs/mobile/). Phase 0 audit: [`design/MOBILE-AUDIT.md`](./MOBILE-AUDIT.md).

---

## Adapter note (this monorepo)

This plan was written against a Next.js-centric layout. **Polara’s real repo differs — follow this adapter, not the outdated paths below.**

| Plan said | Use instead |
|---|---|
| `apps/web/app/api/mobile/v1/*` Next.js route handlers | Fastify [`apps/api`](../apps/api) routes under **`/v1/mobile/*`** |
| New `packages/contracts` | Extend existing [`packages/shared`](../packages/shared) (`@hr/shared`) with mobile Me/sync/outbox Zod schemas |
| Move web into monorepo | Monorepo already exists (`apps/api`, `apps/web`, `packages/db`, `packages/shared`). Add `apps/mobile` + `packages/geo`, `packages/tokens`, `packages/i18n` |
| Separate Zone table | Employee geofence columns (`geofenceLat` / `geofenceLng` / `geofenceRadiusMeters`, `presenceMode`) on `employees` |
| S3-style `POST /uploads/presign` | v1 uses existing in-DB / upload routes ([`apps/api/src/routes/uploads.ts`](../apps/api/src/routes/uploads.ts)); no object store yet |
| Extract from Next server actions | Business logic already lives in Fastify routes + `apps/api/src/services/*` + `apps/api/src/lib/*` |

Ground rule 2 becomes: **reuse Fastify services**; extract from route handlers into `apps/api/src/services/*` when needed, with no behavior change. Ground rule 6: shared types come from **`@hr/shared`**.

---

## 0. Ground rules (paste at the top of every Cursor session)

> You are building the Polara Field mobile app and the mobile API it needs. Follow /design/ELEVORA-MOBILE-APP-PLAN.md, the adapter note at the top, and match /design/elevora-mobile-prototype. Prefer docs/mobile/TICKETS.md for the current ticket.
> 1. The API (`apps/api`) is the system of record. Never duplicate business rules in the mobile app if the server can decide them. The mobile app may pre-check (geofence, balance) for UX, but the server re-validates everything.
> 2. Reuse existing Fastify services and data-access functions for `/v1/mobile/*`. Do not fork logic. If logic lives inside a route handler, extract it into `apps/api/src/services/*` first with no behavior change, and have both the existing `/v1` route and the mobile endpoint call it.
> 3. Every write from the phone is an event with a client-generated UUID, so retries are safe (idempotent).
> 4. The app must be fully usable offline for: Today/clock, map (downloaded areas), shifts, leave (view + create), tasks (view + status + deliverables), history. Writes queue in a local outbox.
> 5. Do not change existing web routes, permissions, or plan gating. Additive changes only.
> 6. TypeScript strict everywhere. Shared types come from `@hr/shared` (mobile sync schemas live there too).

---

## 1. Scope

### In scope (v1)

| Area | Employee | Manager / module role |
|---|---|---|
| Auth | Workspace lookup, email + password, forced password change, Face ID / fingerprint / PIN quick unlock | Same |
| Today & clock | Clock in/out, break start/end, overtime prompt with grace, on-device geofence check, offline clock events | Same |
| Tracking | Background location during shifts only (mobile-presence staff, plus zone exit/enter for fixed-zone staff) | Same |
| Map | Own position, work zone, today's route, offline map packs | Team map (direct reports), live when online |
| Shifts | Upcoming instances, pattern, break and overtime policy, flags | Same |
| Leave | Balances, requests list, new request (all lengths and kinds, attachment), cancel, resubmit when returned | Approvals queue: approve, reject, return with note (managers and users with the `leaves` module role) |
| Tasks | Assigned tasks (shared and individual), status changes, deliverables (photo, file, link), activity | Review submitted tasks (users with the `tasks` module role): accept or request changes |
| History | Attendance sessions by day, totals | — |
| Alerts | Inbox, mark read, push notifications with deep links | Same |
| Profile | Language (EN/AR with RTL), theme, biometrics, sync center, offline maps, sign out | Team today |

### Out of scope (v1)

Hiring, compensation, KPI administration, analytics, integrations, billing, settings, and platform admin stay on the web. The app can link out to the web for them.

### Plan gating (same rules as the web nav)

- Today, History, Alerts and Profile are always available.
- The Map tab and background tracking need the field-ops pack.
- Leave and Tasks tabs need their people-ops modules enabled for the tenant plan (respect overrides and system module roles exactly as the web does). If a module is off, hide its tab and show a 4-tab bar.
- The server returns all of this in `GET /me` → `entitlements`, so the app never computes gating itself.

---

## 2. Architecture

### 2.1 Repository layout (recommended: monorepo)

Move to a pnpm + Turborepo monorepo so the web and mobile apps share types, tokens and translations:

```
elevora/
  apps/
    web/                 # existing Next.js app (moved, unchanged)
    mobile/              # new Expo app
  packages/
    contracts/           # zod schemas + TS types: API requests/responses, sync entities, outbox events
    tokens/              # design tokens (JSON) → web Tailwind preset + NativeWind preset
    i18n/                # shared en.json / ar.json (mobile adds an `app.*` namespace)
    geo/                 # pure TS: haversine, point-in-circle, accuracy rules (used by mobile pre-check AND server validation)
```

If you don't want to move the web app yet, keep it where it is and create `packages/` in a sibling repo. Consume `contracts` through a git submodule or a private npm package. Do not hand-copy types.

### 2.2 Mobile stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Expo (latest stable SDK), React Native, TypeScript, Expo Router | Use a development build (`expo-dev-client`), not Expo Go, because MapLibre and background location need native code |
| Styling | NativeWind (Tailwind for RN) with the shared `packages/tokens` preset | Same color names as web: `canvas`, `frame`, `surface`, `surface-2`, `line`, `ink`, `accent`, `warn`, `danger`, `info` |
| Hatched fills | `react-native-svg` `<Pattern>` (135°, 4px stripe / 9px period) | One `<Hatch tone>` component used by bars, ring, tracks |
| Fonts | General Sans (bundle the OTFs), IBM Plex Sans Arabic via `expo-font` | Switch family by locale |
| Local DB | `expo-sqlite` + Drizzle ORM (migrations in repo) | Local DB is the source the UI reads from |
| Server cache / fetching | TanStack Query for online-only reads (team map, alerts paging) | Offline entities are read from SQLite through hooks, not from the Query cache |
| UI state | Zustand (small stores: session, clock UI, connectivity) | |
| Secure storage | `expo-secure-store` for refresh token + device key; `expo-local-authentication` for biometrics | |
| Location | `expo-location` + `expo-task-manager` (background updates + geofencing) | Android foreground service with a persistent "On shift · tracking" notification |
| Maps | `@maplibre/maplibre-react-native` with its `OfflineManager` for region packs | Vector tiles, styled from tokens (light + dark style JSON) |
| Connectivity | `@react-native-community/netinfo` | Triggers sync |
| Background sync | `expo-background-task` (or `expo-background-fetch` on older SDKs) | Periodic flush when the app is closed |
| Push | `expo-notifications` (Expo push service, or FCM/APNs directly if you prefer) | |
| Files | `expo-image-picker`, `expo-document-picker`, `expo-file-system` uploads | Background upload sessions where the OS supports it |
| i18n | `i18next` + `expo-localization` | RTL via `I18nManager.forceRTL` + `Updates.reloadAsync()` on language change |
| Animations | `react-native-reanimated` | Ring progress, sheets, bar growth |
| Errors / logs | Sentry (`@sentry/react-native`) | Tag tenant, device, app version |
| Builds | EAS Build, EAS Submit, EAS Update (OTA for JS-only fixes) | Channels: `dev`, `staging`, `production` |

### 2.3 Map tiles (important)

Offline packs mean bulk-downloading tiles, which the public OpenStreetMap tile servers do not allow. Use one of these:

1. **Self-hosted (recommended for cost):** generate vector tiles for your regions (for example UAE + Egypt) from OpenStreetMap data using Protomaps/Planetiler. Serve them as z/x/y vector tiles from your VPS or object storage behind a CDN (for example `https://tiles.elevora.app/{z}/{x}/{y}.mvt`). Host two style JSONs (`elevora-light.json`, `elevora-dark.json`) built from the design tokens.
2. **Hosted provider:** a vector tile provider whose plan explicitly allows offline caching in mobile apps. Check the license before choosing.

The style must use the token colors: land `#F1F0EC` / dark `#141618`, blocks `#E6E5E0` / `#1C1F22`, parks `#DCEBC6`, water `#CFE1EA` / `#0E1A21`, roads white / `#272A2E`. Zone circle: accent at 13% fill with a dashed `accent-strong` stroke. Show OSM attribution in the map corner.

### 2.4 How sync works (overview)

```
 ┌──────────── phone ────────────┐                 ┌──────────── web app (Next.js) ───────────┐
 UI ─reads─> SQLite (entities)                       /api/mobile/v1/*
 UI ─writes─> SQLite + outbox  (one transaction)
              outbox worker ──POST /sync/push──────> validate → same services as web → DB
                                <── results per event (applied / duplicate / rejected / conflict)
              pull worker  ──GET /sync/pull?cursor─> changes since cursor (upserts + deletes)
                                <── { changes, cursor }
 location task ─> SQLite (points) ─POST /locations/batch─> location store → live map WebSocket
 push  <────────────────────────── notification service → Expo push
```

---

## 3. Phase 0: Audit the web app (Cursor does this first)

Cursor prompt, phase 0:

> Read the Polara web app repo and write `/design/MOBILE-AUDIT.md`. Cover these points:
> 1. The auth/session mechanism (library, session storage, how tenant and role are resolved per request).
> 2. Where business logic lives for: clock events (in/out/break/overtime), geofence checks, shift instances and patterns, break policy, left-zone incidents, leave requests/decisions/balances/ledger, tasks (status, deliverables, activity, batches), notifications, live map locations (REST and WebSocket), presence mode, work zones, map appearance, entitlements (plan modules, overrides, system module roles).
> 3. The ORM and schema for each of those entities, including timestamps and any version/updatedAt columns.
> 4. The file storage used for attachments.
> 5. How the live map WebSocket authenticates.
> 6. Anything that is only in server actions or React server components and would need extracting into a service function.
>
> Do not change any code yet. End with a list of proposed `lib/services/*` extractions.

Review the audit before continuing. The rest of the plan assumes the services named in the audit.

---

## 4. Phase 1: Shared packages

### 4.1 `packages/contracts`

Zod schemas and exported TS types for:

- `Me`: `{ user, tenant: { id, slug, name, logoUrl, accentPreset, timezone }, role, moduleRoles[], presenceMode: 'fixed' | 'mobile', zones: Zone[], entitlements: { fieldOps, leave, tasks, ... }, locale, theme, managerOf: number }`
- Sync entities, each with `id`, `updatedAt`, `version` and `deletedAt?`:
  - Shifts and schedule: `ShiftInstance`, `ShiftPattern`, `BreakPolicy`, `OvertimePolicy`, `Zone`.
  - Leave: `LeaveType`, `LeavePolicy`, `LeaveBalance`, `LeaveLedgerEntry`, `LeaveRequest`.
  - Tasks: `Task`, `TaskActivity`, `TaskDeliverable`.
  - Attendance and inbox: `ClockSession`, `Notification`.
  - Manager views: `TeamPresence` (managers only).
  - Map: `MapAppearance`, `OfflineRegionSuggestion`.
- Outbox events, a discriminated union on `type`:

```ts
type BaseEvent = {
  id: string;                 // uuid v7 generated on device (idempotency key)
  type: string;
  occurredAt: string;         // device ISO time, corrected by last known server offset
  deviceUptimeMs: number;     // monotonic clock; detects manual device-time changes
  capturedOffline: boolean;
  location?: { lat: number; lng: number; accuracyM: number; mocked?: boolean; at: string };
  baseVersion?: number;       // for edits of existing records (tasks, leave)
};
// type: 'clock.in' | 'clock.out' | 'break.start' | 'break.end' | 'overtime.stay' | 'overtime.decline'
//     | 'zone.exit' | 'zone.enter'
//     | 'leave.create' | 'leave.cancel' | 'leave.resubmit' | 'leave.decide'
//     | 'task.status' | 'task.comment' | 'task.deliverable.link' | 'task.deliverable.file' | 'task.review'
//     | 'notification.read' | 'notification.readAll'
```

- `PushResult`: `{ id, status: 'applied' | 'duplicate' | 'rejected' | 'conflict', reason?, serverRecord?, serverTime }`

### 4.2 `packages/tokens`

`tokens.json` with light and dark values, copied from the web redesign plan (canvas, frame, surface, surface-2, surface-3, line, line-strong, text, text-2, muted, faint, bar-idle, accent set, warn, yellow, danger, info) and the radii (cards 22, inputs 16, tiles 13, chips full). Export a Tailwind preset for the web and a NativeWind preset for mobile. Include accent presets (lime default, teal, emerald, violet), driven by the tenant `accentPreset`.

### 4.3 `packages/geo`

`distanceMeters(a, b)`, `insideZone(point, zone, accuracyM)`, `isAccuracyAcceptable(accuracyM, zone)`. Rule: inside if `distance + min(accuracy, 50) <= radius` for strict tenants, or `distance <= radius` for lenient ones (tenant setting; default strict). Use it in both the app and the server.

Cursor prompt, phase 1:

> Implement Phase 1: create the monorepo (pnpm + Turborepo), move the web app to apps/web with no code changes beyond import paths, and create packages/contracts, packages/tokens, packages/i18n and packages/geo as specified in section 4. Make the web app consume the tokens preset and i18n package without visual changes. Add unit tests for packages/geo. Run the web app build and its tests to prove nothing broke.

---

## 5. Phase 2: Mobile API in the web app

All routes live under `apps/web/app/api/mobile/v1/` as Route Handlers. Every handler resolves `{ tenantId, userId, role, moduleRoles, deviceId }` from the bearer token and then calls the existing services.

### 5.1 Auth

| Endpoint | Purpose |
|---|---|
| `POST /auth/workspace` `{ slug }` | Public. Returns tenant name, logo, accent preset, enabled sign-in methods, `status` (active/suspended). Rate limited |
| `POST /auth/login` `{ slug, email, password, device: { id, platform, model, appVersion } }` | Returns `{ accessToken (JWT, 15 min), refreshToken (opaque, 60 days, rotating), mustChangePassword, me }` |
| `POST /auth/refresh` `{ refreshToken, deviceId }` | Rotates. Reuse of an old refresh token revokes the whole device session (theft detection) |
| `POST /auth/change-password` | For the forced first change |
| `POST /auth/logout` | Revokes the device session |

New tables: `mobile_devices` (id, tenant_id, user_id, platform, model, app_version, push_token, last_seen_at, revoked_at), `mobile_refresh_tokens` (hash, device_id, expires_at, replaced_by). Admins should be able to revoke devices later. This plan only adds the table.

### 5.2 Profile and sync

| Endpoint | Purpose |
|---|---|
| `GET /me` | `Me` contract, including entitlements and zones |
| `GET /sync/pull?cursor=&scopes=` | Returns `{ changes: { [entity]: { upserts: [], deletes: [] } }, cursor, serverTime }`. Uses `updatedAt > cursor` per entity, scoped to what the user may see. First pull (no cursor) sends: shift instances from −7 to +14 days, patterns, policies, zones, leave types and balances, last 90 days of ledger and requests, open plus 30 days of closed tasks, 60 days of notifications, and 30 days of clock sessions. Managers also get the approvals queue and team presence |
| `POST /sync/push` `{ events: BaseEvent[] }` (max 100) | Processes events in order. Idempotent on `event.id` via a new `client_events` table (id PK, tenant_id, user_id, device_id, type, status, result_json, received_at). A replayed id returns the stored result |
| `POST /locations/batch` `{ points: [{ lat, lng, accuracyM, speed, heading, at, mocked }] }` (gzip, max 500) | Writes to the same location store the web live map and history use, and broadcasts the newest point on the existing WebSocket |
| `POST /uploads/presign` `{ fileName, mime, size, purpose: 'leave-attachment' | 'task-deliverable' }` | Returns a direct-upload URL to the storage the web already uses, plus an `uploadId`. The event then references `uploadId` |
| `GET /team/presence` | Managers only. Same data as Team today, direct reports |
| `GET /map/regions` | Suggested offline regions: bounding boxes around the user's zones and upcoming shift zones, plus the style URLs |
| `GET /realtime/token` | Short-lived token so the app can join the existing live map WebSocket |

### 5.3 Server rules for events

- **Clock time.** When online, the server time is the official timestamp (existing rule). For `capturedOffline: true`, store `occurred_at = event.occurredAt` and also `received_at`, `source = 'mobile_offline'` and `device_id`. Reject with `rejected:'too_old'` (it goes to the admin review list) if the event is older than the tenant's limit (default 72 h). Flag it as `time_suspect` if the device clock jumped (device uptime vs wall clock disagree by more than 2 min).
- **Geofence.** Re-validate fixed-zone clock-ins with `packages/geo` using the submitted location. Reject `outside_zone`, `low_accuracy`, or `mocked_location`, each with a human-readable message. Mobile-presence employees skip this.
- **Ordering.** Clock events for one user must be processed in `occurredAt` order. If a `clock.out` arrives with no open session, create a correction alert for the admin instead of failing silently.
- **Breaks.** A `zone.exit` during an open break creates no left-zone incident (existing product rule). Outside breaks, it creates the same incident the web creates today.
- **Overtime.** `overtime.stay` and `overtime.decline` follow the existing grace-period logic. If no decision arrives by the end of grace, the server auto-clocks out exactly as the web does.
- **Leave.** `leave.create` runs the same validation as the web (balance, half-day rules, attachment required, conflicts). Conflicts are warnings, not blocks. `leave.decide` requires approver rights.
- **Tasks.** `task.status` and `task.review` carry `baseVersion`. If the server version is newer and the change isn't a no-op, return `conflict` with `serverRecord`.
- **Notifications.** When the existing notification service creates a notification, also send a push to the user's active devices (`/push` adapter), with `{ type, entityId, deepLink }`.

### 5.4 Small web-side additions

- An "Offline" badge on attendance sessions with `source = 'mobile_offline'`, plus "Time suspect" for flagged ones. Reuse the existing chip component in the attendance and hours views.
- A "Devices" list in the employee drawer (read-only in v1).
- Rejected or too-old offline events appear in the existing alerts system as admin alerts.

Cursor prompt, phase 2:

> Implement Phase 2 in apps/web. Using /design/MOBILE-AUDIT.md, extract any needed logic into lib/services/* with no behavior change, then add the /api/mobile/v1 route handlers, tables and rules from section 5 using the existing ORM and migrations. Validate all input and output with packages/contracts. Add integration tests for these cases:
> - Idempotent replay of /sync/push.
> - Offline clock-in older than 72h.
> - Fixed-zone clock-in outside the zone.
> - Zone exit during a break.
> - Task conflict.
> - Leave create offline then approved on web.
> - Refresh token reuse.
>
> Keep all existing web behavior and tests passing.

---

## 6. Phase 3: Mobile foundation

- `npx create-expo-app apps/mobile -t expo-template-blank-typescript`, then add Expo Router, the dev client, NativeWind with the tokens preset, fonts, Reanimated and SVG.
- `app.config.ts` holds the bundle ids (`com.xaeon.elevora`), the scheme `elevora://` for deep links, and three env profiles (dev, staging, prod API base URLs).
- Permissions strings:
  - iOS: `NSLocationWhenInUseUsageDescription`, `NSLocationAlwaysAndWhenInUseUsageDescription`, `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, `NSFaceIDUsageDescription`, `UIBackgroundModes: [location, fetch, remote-notification]`.
  - Android: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.
- Theme: `useColorScheme` plus the user override. Accent comes from `me.tenant.accentPreset`.
- i18n: load `packages/i18n`. Arabic switches `I18nManager.forceRTL(true)` and reloads. All styles use logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`). Directional icons flip. Rings, time bars and the map do not mirror.

### 6.1 Route map (Expo Router)

```
app/
  _layout.tsx                 providers: theme, i18n, db, query, session, sync
  index.tsx                   splash → decides route
  (auth)/workspace.tsx        Find your workspace
  (auth)/sign-in.tsx          Sign in
  (auth)/change-password.tsx
  (auth)/unlock.tsx           Face ID / PIN
  (onboarding)/permissions.tsx
  (onboarding)/offline-map.tsx
  (tabs)/_layout.tsx          floating tab bar (Today, Map, Shifts, Tasks, Leave — gated)
  (tabs)/index.tsx            Today (off / on / break / offline states)
  (tabs)/map.tsx              Me / My team
  (tabs)/shifts.tsx
  (tabs)/tasks.tsx
  (tabs)/leave.tsx
  shifts/[id].tsx
  leave/new.tsx  leave/[id].tsx  leave/approvals.tsx
  tasks/[id].tsx
  offline-maps/index.tsx  offline-maps/new.tsx
  history.tsx  alerts.tsx  sync.tsx  profile.tsx  team.tsx
  modal/clock-check.tsx       bottom sheet: verify location → clock in
  modal/overtime.tsx          bottom sheet: overtime prompt
```

### 6.2 Components (`apps/mobile/components/ui`)

Build these to match the prototype exactly (sizes are in `styles.css` of the prototype):

- `Screen` (safe area, frame background, scroll body with 110px bottom padding for the floating tab bar).
- `FloatingTabBar` (66px, 24px radius, 12px side inset, accent 3px indicator, count badge).
- `AppHeader` (avatar with presence dot, greeting, tenant · zone, bell with dot).
- `NavHeader` (back button + centered title + optional end action).
- `Card` (22px radius), `Section` header, `ListRow`, `IconTile` (tones), `Avatar` (initials on hashed pastel, presence dot), `Chip` (tones: ok, warn, danger, info, ink, line), `StatusChip` (status → tone map shared with web).
- `Button` (ink, accent, line, soft, danger-soft; 50px and 38px sizes), `Segmented`, `Switch`, `TextField` (52px), `TextArea`, `DateRangeCalendar`, `DayStrip`.
- `Hatch` (SVG pattern), `ProgressTrack` (xs/sm/lg), `SegmentBar`, `ClockRing` (236px, 10px stroke, animated), `ClockButton` (172px circle; in = hatched accent, out = ink, break = hatched warn), `SessionBar`, `Timeline`.
- `Sheet` (34px radius, scrim, grab handle; use `@gorhom/bottom-sheet`), `Notice` (tones), `OfflineBanner`, `SyncPill`.
- `MapView` wrapper (MapLibre + Polara style + zone layer + trail layer + team markers + you marker), `MiniMap` (static, non-interactive).
- `EmptyState`, `Skeleton`.

Cursor prompt, phase 3:

> Implement Phase 3 in apps/mobile: Expo + dev client + Expo Router with the route map in 6.1, NativeWind using packages/tokens, fonts, theme, i18n with RTL, and every component in 6.2 matching /design/elevora-mobile-prototype (read styles.css for exact sizes, radii, hatch pattern, ring geometry). Add a hidden /dev/ui route that renders all components in light, dark and RTL. Screens can render placeholder data from a local fixtures file for now.

---

## 7. Phase 4: Auth and onboarding

- Workspace screen: the slug input calls `/auth/workspace`. Show the tenant logo and name on sign-in, apply the tenant accent immediately, and block suspended tenants with a clear message. "Scan invite QR" decodes `elevora://join?slug=...&email=...`.
- Sign in: on success, store the refresh token in SecureStore, keep the access token in memory, and write `me` to SQLite. If `mustChangePassword` is set, go to the change-password screen.
- Quick unlock: offer biometrics, falling back to a 4-digit PIN (stored as a salted hash in SecureStore). Ask for unlock on cold start and after 15 min in the background. Unlocking works offline, because it only unlocks local data and the stored refresh token.
- Permissions: the explainer screen comes before each OS prompt (Google Play requires a prominent disclosure before background location). Request "Always" location only for mobile-presence employees. Fixed-zone staff get "While using", plus geofencing where the OS allows it.
- Offline map onboarding: call `/map/regions` and download the suggested packs with progress (Wi-Fi only by default). Users can skip it.
- Session expiry: if refresh fails because the session was revoked or expired, keep the outbox, ask the user to sign in again, and only flush the outbox if the same user signs back in. If a different user signs in, show the leftover queue count and let an admin-approved "discard" happen. Never send it under another user.

Cursor prompt, phase 4:

> Implement Phase 4 (section 7): the auth API client with token refresh and rotation, secure storage, the workspace / sign-in / change-password / unlock / permissions / offline-map screens matching the prototype, and the session-expiry rules. Write tests for the token refresh queue (parallel 401s trigger one refresh).

---

## 8. Phase 5: Local database and sync engine

### 8.1 SQLite schema (Drizzle)

- Mirror tables for every sync entity in `packages/contracts`, each with `id`, `version`, `updated_at`, `deleted_at`, and `local_status` (`synced` | `pending` | `conflict`) for user-editable rows.
- `outbox` (id uuid PK, type, payload json, aggregate_key, status `pending|sending|failed|done|conflict`, attempts, next_attempt_at, last_error, created_at).
- `location_points` (id, lat, lng, accuracy, speed, heading, at, mocked, sent).
- `sync_state` (key, value): pull cursor, last success, server offset ms, last uptime.
- `uploads` (id, local_uri, purpose, status, upload_id, progress, event_id).

### 8.2 Rules

- **Writes:** a UI action writes the local row (optimistic) and the outbox event in one SQLite transaction, then pokes the worker.
- **Push worker:**
  - Runs on connectivity regained, app foreground, after each write, and from the background task every 15 min.
  - Sends up to 100 pending events in creation order.
  - Events with the same `aggregate_key` are strictly ordered. For example, all clock events share `clock:{userId}`, and a single task shares `task:{id}`.
  - Retries with exponential backoff: 2s, 4s, 8s, up to 5 min.
  - Results: `applied`/`duplicate` mark the event done and upsert `serverRecord`. `rejected` marks it failed and shows a notice and an alert item. `conflict` marks it as a conflict and lists it in the Sync center.
- **Pull worker:** runs after each successful push, every 5 min in the foreground, and on a push-notification "data changed" signal. Apply upserts and deletes in a transaction, then save the new cursor.
- **Server clock offset:** every response includes `serverTime`. Store `offset = serverTime - deviceNow` and the device uptime. Correct `occurredAt` for offline events with that offset, and flag the event if the device's wall clock moved inconsistently with uptime.
- **Conflict UX** (Sync center): show both versions in plain words, with two choices: "Keep web version" (drop the local change) or "Re-apply mine" (send a new event with the fresh `baseVersion`).
- **Uploads:** they run separately and resumably. The deliverable or attachment event is only sent after the upload succeeds, and it references `uploadId`.

Cursor prompt, phase 5:

> Implement Phase 5 (section 8): the Drizzle schema and migrations, typed repositories, the outbox + push worker + pull worker + background task, the clock-offset handling, and the Sync center screen. Expose React hooks (useToday, useShifts, useLeave, useTasks, useHistory, useOutbox) that read from SQLite and re-render on change. Add tests for these cases:
> - Ordering by aggregate.
> - Retry/backoff.
> - Duplicate result.
> - Conflict flow.
> - Cursor advance.
> - App killed mid-send (the event is re-sent and the server dedupes it).

---

## 9. Phase 6: Clock, geofence and tracking

### 9.1 Clock flow

1. On Today, the app keeps a fresh location fix (foreground watch at 10 s / 10 m while the screen is open) and shows "Inside zone · 42 m" or "Outside".
2. Tapping Clock in opens `modal/clock-check`. The sheet checks four things in turn: location found (accuracy), inside zone (`packages/geo`), not mocked (Android `mocked` flag), then the send.
3. If online, the app sends immediately and the server time becomes official. If offline, it saves to the outbox and shows "Saved on this phone".
4. Outside the zone for fixed-zone staff: show the Outside screen with distance, a walk hint, accuracy tips and a "Try again" button. Never let the user override this on the device.
5. Clock out, break start/end and overtime choices follow the same pattern.

### 9.2 Background tracking

- Start at clock-in, and only for employees whose plan includes field ops.
- Mobile-presence staff get `Location.startLocationUpdatesAsync` with balanced accuracy, a 50 m distance interval, a 60 s time interval, iOS pausing enabled, and an Android foreground service notification ("On shift · tracking location").
- Fixed-zone staff get `Location.startGeofencingAsync` on their zone instead of continuous tracking. Enter/exit become `zone.exit` / `zone.enter` events. While a break is open, exits are marked as break exits.
- Points go to SQLite and flush to `/locations/batch` every 2 min or every 100 points when online.
- Stop everything on clock-out, on auto clock-out, and on sign-out. Never track outside a shift. Show a "Tracking" chip whenever it is active.
- At shift end: schedule a local notification at shift end, and another at grace end minus 2 min, so the overtime prompt works with no signal.

Cursor prompt, phase 6:

> Implement Phase 6 (section 9): the Today screen states (off, on shift, on break, offline), the clock-check sheet, the Outside zone screen, the overtime sheet with local notifications, the background location task and geofencing task with the rules above, and the batching to /locations/batch. Match the prototype screens today, verify, today-on, today-break, outside, overtime and offline. Document how to test with simulated locations on iOS Simulator and Android Emulator in apps/mobile/TESTING.md.

---

## 10. Phase 7: Maps and offline packs

- `MapView` uses the Polara style URL (light or dark by theme) and adds these layers:
  - The work zone circle, drawn as a GeoJSON polygon from center + radius.
  - Today's route from local `location_points`.
  - A "you" marker (info blue with a halo).
  - Team markers (managers): accent for on shift, warn for late, grey for last seen.
- Offline packs: `OfflineManager.createPack({ name, styleURL, bounds, minZoom: 10, maxZoom: 16 or 17 })`.
  - The Offline maps screen lists packs with size, status and progress, plus delete and refresh actions.
  - "Download another area" opens the area picker. Estimate size from bounds × zoom before downloading.
  - Auto-download zones of upcoming shifts on Wi-Fi.
  - Refresh packs older than 30 days.
  - Respect a 500 MB storage cap (setting).
- Team map: join the existing WebSocket using `/realtime/token`. Fall back to polling `/team/presence` every 30 s. When offline, show last known positions with a "Last seen" style.

Cursor prompt, phase 7:

> Implement Phase 7 (section 10): the MapLibre wrapper with Polara light/dark styles and the zone/route/you/team layers, the Map tab (Me and My team), Offline maps list and area picker using OfflineManager, auto-download for shift zones, and the live team map with WebSocket + polling fallback. Match the prototype screens map, map-team, offline-maps and map-select.

---

## 11. Phase 8: Shifts, Leave and Tasks

- **Shifts:** a day strip, the today card with the session bar, week totals (scheduled, worked, overtime), upcoming instances with "Changed" chips when the version changed since last viewed, and recent flags (late in, left zone, deduction). The shift detail shows the mini map, window, presence mode, break, overtime grace, pattern days and today's timeline.
- **Leave:**
  - Main screen: balances (annual hero card plus small cards) and requests with status chips.
  - New request: the type chips come from tenant leave types. Hide types the user can't request. Length options are full day, 1st half, 2nd half and hours, and the half options only show when the type allows half days. Then planned or emergency, a range calendar, the live balance (balance, this request, after), a conflict warning computed locally from cached team leave and re-checked by the server, an optional note, and an attachment (required if the type requires one).
  - Offline: save as pending with the label "Waiting to send".
  - Detail: a timeline, cancel while pending, and edit and resubmit when returned.
  - Approvals: managers and `leaves` module-role users can approve, reject or return with a note.
- **Tasks:**
  - List: segmented filters (open, in progress, submitted, done). Cards show priority and status chips, due date, deliverable type, batch progress for individual tasks, the avatar stack for shared ones, and tags.
  - Detail: description, mini map if the task has a location, deliverables (photo, file, link) with upload progress, the activity log, and "Submit for review" when review is required (otherwise "Mark complete").
  - Changes requested: show the reviewer note at the top.
  - Review queue for `tasks` module-role users: accept or request changes with a note.

Cursor prompt, phase 8:

> Implement Phase 8 (section 11) using the SQLite hooks and outbox events: shifts list and detail, leave home / new / detail / approvals, tasks list / detail / review. Every write must work offline and show its pending state. Match the prototype screens shifts, shift, leave, leave-new, leave-detail, approvals, tasks and task. Use the exact status sets and leave rules from the web services (via packages/contracts), and don't invent new ones.

---

## 12. Phase 9: History, alerts, push, profile, manager

- **History:** the day strip, totals, sessions per day with the session bar, and "Offline" and "Late in" chips.
- **Alerts:** the inbox with category filter, mark read, and mark all read.
- **Push:** register the Expo push token at sign-in and on token change, and deep-link by type. Types and their destinations:
  - `leave.decided` → the leave request.
  - `task.assigned` / `task.changes_requested` → the task.
  - `shift.reminder` → Today.
  - `overtime.prompt` → the overtime sheet.
  - `zone.incident` → the shift.
  - `announcement` → Alerts.
- **Profile:**
  - Profile card (on-time %, leave days, KPI score if the KPI module is on).
  - Links to History, Alerts, Team today (managers), Sync center and Offline maps.
  - Preferences: language, dark mode, biometrics, and a location and privacy page explaining what is tracked and when.
  - Sign out, which stops tracking and clears local data after the outbox is empty, or warns if it isn't.
- **Team today (managers):** four stat cards and the list of direct reports with status, plus "See on map".

Cursor prompt, phase 9:

> Implement Phase 9 (section 12): history, alerts, push registration and deep links, profile with preferences, and Team today for managers. Match the prototype screens history, alerts, more and team.

---

## 13. Phase 10: Hardening, QA and release

### 13.1 Test matrix (must pass on a real iPhone and a real mid-range Android)

- [ ] Airplane mode for a full shift: clock in, break, leave the zone during the break, clock out. Turn the network back on; everything syncs once, in order, with server dedupe.
- [ ] App force-quit while on shift: tracking continues (Android foreground service; iOS significant changes), the overtime notification fires, and the next open shows the correct state.
- [ ] The device time is changed manually while offline: the events are flagged `time_suspect`.
- [ ] Mock location app (Android): clock-in is blocked on the device and on the server.
- [ ] A fixed-zone employee 300 m away sees the Outside screen. A mobile employee anywhere can clock in.
- [ ] A leave request created offline, then approved on the web: the app shows Approved after pull and the balance updates.
- [ ] A task edited on the web while the phone changes its status offline produces the conflict in the Sync center, and both choices work.
- [ ] Session revoked on the web while the phone is offline: the queue is kept, the user signs in again, and the queue flushes.
- [ ] Module disabled on the tenant plan: the tab disappears after the next `/me`.
- [ ] Arabic: full RTL, Plex Arabic font, and the numbers, time bars and map not mirrored.
- [ ] Dark mode on every screen, including the map style.
- [ ] Battery: a 9 h shift with tracking stays under about 10–12% on the test Android (tune the intervals if not).
- [ ] Offline map: the zone and route render with no network after downloading.

### 13.2 Store readiness

- **iOS:** "Always" location purpose strings that explain shift-only tracking, background modes, and a privacy manifest. Provide a demo account for App Review.
- **Android:** Play Console background location declaration (with a short video of the disclosure screen), foreground service type `location`, and the data safety form (location, photos, device IDs).
- **EAS:** set up the `development`, `preview` (internal testers) and `production` profiles, plus EAS Update channels per profile. Versioning: `version` is semantic and `buildNumber`/`versionCode` auto-increment.
- **Feature flag:** the tenant setting `mobileAppEnabled` (default on for field-ops plans). The web settings page shows the app download links when it is on.

Cursor prompt, phase 10:

> Implement Phase 10: add Sentry, finish the empty, loading and error states on every screen, add the store configs and EAS profiles, and write apps/mobile/QA.md with the full test matrix from 13.1 and how to run each test. Fix every issue found.

---

## 14. Screen inventory (prototype → route)

| Prototype screen | Route | Notes |
|---|---|---|
| Splash | `app/index.tsx` | Restore session |
| Find your workspace | `(auth)/workspace` | Tenant branding |
| Sign in | `(auth)/sign-in` | Email + password |
| Quick unlock | `(auth)/unlock` | Face ID / PIN |
| Permissions | `(onboarding)/permissions` | Disclosure first |
| Get offline map | `(onboarding)/offline-map` | Wi-Fi only default |
| Today (before shift) | `(tabs)/index` | Clock in |
| Clock-in check | `modal/clock-check` | Works offline |
| On shift | `(tabs)/index` | Ring + tracking |
| On break | `(tabs)/index` | Zone exits allowed |
| Outside the zone | `(tabs)/index` state | Fixed-zone only |
| Overtime prompt | `modal/overtime` | Local notification |
| Offline mode | `(tabs)/index` | Banner + queue |
| Map | `(tabs)/map` | Me |
| Team map | `(tabs)/map?view=team` | Managers |
| Offline maps | `offline-maps/index` | Packs |
| Choose area | `offline-maps/new` | Area picker |
| My shifts | `(tabs)/shifts` | |
| Shift detail | `shifts/[id]` | |
| Leave | `(tabs)/leave` | Balances + requests |
| New leave request | `leave/new` | |
| Request detail | `leave/[id]` | |
| Approvals | `leave/approvals` | Managers / leaves role |
| My tasks | `(tabs)/tasks` | |
| Task detail | `tasks/[id]` | Deliverables |
| History | `history` | |
| Alerts | `alerts` | |
| Sync center | `sync` | Outbox + conflicts |
| Profile & more | `profile` | |
| Team today | `team` | Managers |

---

## 15. Suggested order and timeline

1. Phase 0–1: audit and shared packages.
2. Phase 2: mobile API with tests. This is the riskiest part, so do it early.
3. Phase 3–5: app foundation, auth, sync engine.
4. Phase 6–7: clock, tracking, maps. Field test here with 2–3 real employees.
5. Phase 8–9: shifts, leave, tasks, history, alerts, push.
6. Phase 10: hardening and store submission.

Ship an internal build (EAS preview) to one tenant after phase 7 and keep it on staging until the phase 10 matrix passes.
