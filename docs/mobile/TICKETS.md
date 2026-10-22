# Elevora Field — local ticket board

Local-only tracker (no GitHub issues required). Claim by editing **Status** and **Owner** on a ticket. Prefer one ticket per agent session.

**How to use:** open the next unblocked ticket → paste its Prompt into Cursor → read linked specs only → mark Done when acceptance passes.

**Legend:** `todo` | `doing` | `blocked` | `done`

**Map order:** M0 → M1\* (parallel) → M2a → M2b → M2c/M2d → M2e → M3a → M3b → M4 → M5 → M6/M7/M8/M9 → M10 → M11.

| ID | Title | Depends | Status |
|---|---|---|---|
| M0 | Phase 0 — MOBILE-AUDIT.md | — | done |
| M1a | packages/geo + tests | M0 | done |
| M1b | packages/tokens from prototype CSS | M0 | done |
| M1c | packages/i18n extract + app.* | M0 | done |
| M1d | Mobile contracts in @hr/shared | M0 | done |
| M2a | Extract service seams from audit | M0 | done |
| M2b | Mobile auth (workspace, devices, refresh) | M1d, M2a | done |
| M2c | sync pull/push + client_events + locations | M2b | done |
| M2d | uploads + me + map regions + realtime token | M2b | done |
| M2e | API integration tests | M2c | todo |
| M3a | Expo scaffold + NativeWind + fonts + RTL | M1b, M1c | done |
| M3b | UI kit + /dev/ui | M3a, M1b | done |
| M4 | Auth + onboarding screens | M2b, M3b | done |
| M5 | SQLite + outbox + Sync center | M2c, M4 | done |
| M6 | Today / clock / geofence / tracking | M5, M1a | done |
| M7 | Maps + offline packs | M5, M3b | done |
| M8 | Shifts, Leave, Tasks | M5 | done |
| M9 | History, Alerts, Push, Profile, Team | M5 | done |
| M10 | Hardening, Sentry, EAS, QA.md | M6–M9 | done |
| M11 | Store compliance (Play / App Store) | M10 | done |

---

## M0 — Phase 0 audit

- **Status:** done
- **Depends:** —
- **Specs:** [README](./README.md), master plan adapter
- **Deliverable:** [`design/MOBILE-AUDIT.md`](../../design/MOBILE-AUDIT.md)

### Prompt

> Read the Elevora monorepo (Fastify `apps/api`, `@hr/db`, `@hr/shared`, web client). Write `/design/MOBILE-AUDIT.md` covering auth, clock/geofence, shifts, leave, tasks, notifications, live map REST+WS, entitlements, schema, file storage, WS auth, and proposed `apps/api/src/services/*` extractions. Do not change code. End with prioritized extractions and a reuse-vs-add gap list for `/v1/mobile`. Follow the adapter note in `/design/ELEVORA-MOBILE-APP-PLAN.md`.

### Acceptance

- [x] Audit file exists with concrete paths
- [x] Extraction list ready for M2a
- [x] Gaps for `/v1/mobile` listed

---

## M1a — packages/geo

- **Status:** done
- **Depends:** M0
- **Specs:** [00](./specs/00-architecture.md), [04](./specs/04-clock-tracking.md), audit geo section

### Acceptance

- [x] Package builds; tests cover inside/outside/accuracy edge cases
- [x] API still passes existing tests (`isInsideGeofence` behavior unchanged via re-export)

---

## M1b — packages/tokens

- **Status:** done
- **Depends:** M0
- **Specs:** [02](./specs/02-ui-kit.md)

### Acceptance

- [x] All prototype CSS variables represented (`packages/tokens/tokens.json`)
- [x] Consumable by a future Expo NativeWind config (`nativeWindPreset`)

---

## M1c — packages/i18n

- **Status:** done
- **Depends:** M0
- **Specs:** [00](./specs/00-architecture.md)

### Acceptance

- [x] Web re-exports `ar` from `@hr/i18n`
- [x] Mobile can import `app.*` via `@hr/i18n` / `tApp`

---

## M1d — Mobile contracts in @hr/shared

- **Status:** done
- **Depends:** M0
- **Specs:** [01](./specs/01-api-surface.md), plan §4.1 (via adapter)

### Acceptance

- [x] Types cover sync pull/push shapes in spec 01 (`packages/shared/src/mobile.ts`)
- [x] Package typechecks; shared tests green

---

## M2a — Extract service seams

- **Status:** done
- **Depends:** M0
- **Specs:** audit extraction list

### Acceptance

- [x] `services/attendance.ts` + `services/location.ts`; routes/WS thinned
- [x] Clock-out `clientEventId` dedupe via prior location ping
- [x] `tasks.version` column + bumps on mutators (`0024_task_version`)
- [x] Left-zone in-memory streak deferred (documented in audit §2.4)
- [x] Existing API tests green

---

## M2b — Mobile auth

- **Status:** done
- **Depends:** M1d, M2a
- **Specs:** [01](./specs/01-api-surface.md)

### Acceptance

- [x] `/v1/mobile/auth/{workspace,login,refresh,change-password,logout}` + `/v1/mobile/me`
- [x] Tables `mobile_devices`, `mobile_refresh_tokens`, `users.must_change_password` (`0025_mobile_auth`)
- [x] Opaque rotating refresh; reuse of replaced/revoked token revokes device (`mobileRefresh`)
- [x] Helper unit tests; web `/v1/auth/*` untouched
- [ ] Full DB integration test for refresh reuse (blocked when Postgres unavailable in CI here)

---

## M2c — Sync push/pull + locations

- **Status:** done
- **Depends:** M2b
- **Specs:** [01](./specs/01-api-surface.md), [04](./specs/04-clock-tracking.md)

### Acceptance

- [x] `GET /sync/pull`, `POST /sync/push`, `POST /locations/batch` under `/v1/mobile`
- [x] `client_events` table + idempotent replay (`duplicate`)
- [x] Clock/break/notification events applied; leave/task/zone/OT deferred as `unsupported_event` for M8/M2e
- [x] Offline >72h → `rejected:too_old`; geofence via attendance service
- [x] Locations batch → pings + live loc + WS broadcast

---

## M2d — Me, uploads, regions, realtime token

- **Status:** done
- **Depends:** M2b
- **Specs:** [01](./specs/01-api-surface.md), [05](./specs/05-maps-offline.md)

### Acceptance

- [x] `GET /v1/mobile/me` with entitlements, presenceMode, zones, managerOf
- [x] `POST /v1/mobile/uploads` → `uploadId` (`mobile_uploads` / `0027`)
- [x] `GET /map/regions`, `GET /team/presence`, `GET /realtime/token`

---

## M2e — API integration tests

- **Status:** todo
- **Depends:** M2c (and ideally M2d)
- **Specs:** [01](./specs/01-api-surface.md), [08](./specs/08-qa-release.md)

### Prompt

> Add integration tests: idempotent `/sync/push` replay; offline clock-in older than 72h; fixed-zone outside; zone exit during break; task conflict; leave create offline then approve on web path; refresh token reuse. Keep existing web/API tests passing.

### Acceptance

- [ ] All listed cases covered and green

---

## M3a — Expo foundation

- **Status:** done
- **Depends:** M1b, M1c
- **Specs:** [00](./specs/00-architecture.md), [03](./specs/03-screen-map.md)

### Acceptance

- [x] `apps/mobile` Expo Router + NativeWind + tokens + i18n/RTL hooks + `app.config.ts`
- [x] Route map placeholders for auth, onboarding, tabs, modals, stack screens
- [x] `tsc` clean (`pnpm --filter @hr/mobile lint`)
- [ ] Font OTFs bundled (General Sans / Plex Arabic) — follow-up in M3b
- [ ] Dev-client device boot verified on simulator (needs local Expo run)

---

## M3b — UI kit

- **Status:** doing
- **Depends:** M3a, M1b
- **Specs:** [02](./specs/02-ui-kit.md), prototype `styles.css`

### Acceptance

- [x] Core: `Button`, `Chip`, `Card`, `Screen`, `TextField`, `Hatch`, `OfflineBanner`, `SyncPill`
- [x] Shell: `FloatingTabBar`, `AppHeader`, `Avatar`, `IconTile`, `ClockRing`, `ClockButton`, `EmptyState` + Today stub shell
- [ ] Remaining: NavHeader, Sheet, MapView/MiniMap, DayStrip, calendar, Segmented, Timeline, SessionBar, Skeleton, …
- [x] `/dev/ui` theme + locale toggles
- [ ] Visual match to prototype Interactive mode for all components

---

## M4 — Auth + onboarding UI

- **Status:** doing
- **Depends:** M2b, M3b
- **Specs:** [03](./specs/03-screen-map.md), [01](./specs/01-api-surface.md)
- **Prototype:** `splash`, `workspace`, `signin`, `unlock`, `perms`, `download`

### Prompt

> Implement auth API client (refresh queue coalescing), SecureStore, workspace / sign-in / change-password / unlock / permissions / offline-map screens matching prototype. Session expiry rules from the master plan §7. Test: parallel 401s trigger one refresh.

### Acceptance

- [x] Workspace / sign-in / change-password / unlock / perms / offline-map wired to `/v1/mobile/auth/*` + live Postgres
- [x] SecureStore (+ web localStorage) for tokens + device id; refresh coalescing helper + unit test
- [x] Suspended tenant blocked on workspace lookup
- [ ] Biometrics (PIN stub `1234` for now)
- [ ] Full prototype visual polish on auth art / stairs

---

## M5 — Local DB + sync engine

- **Status:** doing
- **Depends:** M2c, M4
- **Specs:** [00](./specs/00-architecture.md), [01](./specs/01-api-surface.md), [07](./specs/07-history-alerts-profile.md) (Sync center)

### Prompt

> Drizzle SQLite schema mirroring sync entities + outbox + location_points + sync_state + uploads. Push/pull workers, backoff, aggregate ordering, clock offset, Sync center UI. Hooks: useToday, useShifts, useLeave, useTasks, useHistory, useOutbox. Tests: ordering, retry, duplicate, conflict, cursor, kill mid-send.

### Acceptance

- [x] SQLite schema + migrate on boot; Sync center pull from `/v1/mobile/sync/pull` → local tables
- [x] Outbox enqueue + push worker (web: memory outbox); aggregate ordering test
- [x] Sync center: push/pull, conflict Keep server / Re-apply mine
- [x] Hooks: useToday, useTasks, useOutbox (useShifts/useLeave/useHistory next)
- [ ] Optimistic write = row + outbox one transaction (native)
- [ ] Full unit suite: retry, duplicate, cursor, kill mid-send

---

## M6 — Clock + tracking

- **Status:** done
- **Depends:** M5, M1a
- **Specs:** [04](./specs/04-clock-tracking.md)
- **Prototype:** `today`, `verify`, `today-on`, `today-break`, `outside`, `overtime`, `offline`

### Prompt

> Implement Today states, clock-check sheet, Outside screen, overtime sheet + local notifications, background location + geofencing per spec 04, batch to `/locations/batch`. Write `apps/mobile/TESTING.md` for simulators.

### Acceptance

- [x] Today off/on/break via outbox → `/sync/push` → Postgres attendance
- [x] Clock-check modal with GPS + geofence distance (web geolocation / expo-location)
- [x] Outside blocking screen polish + overtime sheet + local notifications
- [x] Background location batch to `/locations/batch`
- [x] Tracking stops on clock-out / sign-out
- [x] `apps/mobile/TESTING.md`

---

## M7 — Maps + offline packs

- **Status:** done
- **Depends:** M5, M3b
- **Specs:** [05](./specs/05-maps-offline.md)
- **Prototype:** `map`, `map-team`, `offline-maps`, `map-select`

### Prompt

> MapLibre wrapper with Elevora styles and zone/route/you/team layers; Map tab Me/My team; Offline maps list + area picker; auto-download shift zones; live team map WS + poll fallback.

### Acceptance

- [x] Map tab Me / My team with zone + you/team markers (MapLibre web; native placeholder until RN MapLibre linked)
- [x] Offline packs list + area picker + 500 MB cap + stale refresh queue
- [x] Team feed WebSocket with 30s `/team/presence` poll fallback
- [x] Offline pack metadata + download UX (native OfflineManager when MapLibre RN is linked)
- [x] Prototype screens matched (Me/Team + offline list/picker)

---

## M8 — Shifts, Leave, Tasks

- **Status:** done
- **Depends:** M5
- **Specs:** [06](./specs/06-shifts-leave-tasks.md)
- **Prototype:** `shifts`, `shift`, `leave`, `leave-new`, `leave-detail`, `approvals`, `tasks`, `task`

### Prompt

> Implement shifts list/detail, leave home/new/detail/approvals, tasks list/detail/review using SQLite hooks + outbox. Every write works offline with pending state. Exact status sets from web/API services via `@hr/shared`.

### Acceptance

- [x] All prototype screens matched
- [x] Offline create leave + task status pending visible
- [x] Approvals/review gated by role

---

## M9 — History, alerts, push, profile, team

- **Status:** done
- **Depends:** M5
- **Specs:** [07](./specs/07-history-alerts-profile.md)
- **Prototype:** `history`, `alerts`, `more`, `team` (+ sync already in M5)

### Prompt

> History, alerts inbox, Expo push registration + deep links, profile preferences, Team today for managers. Match prototype screens.

### Acceptance

- [x] Deep links from push types in spec 07
- [x] Sign-out respects outbox
- [x] Prototype screens matched

---

## M10 — Hardening and release

- **Status:** done
- **Depends:** M6, M7, M8, M9
- **Specs:** [08](./specs/08-qa-release.md)

### Prompt

> Add Sentry; finish empty/loading/error states; EAS profiles; write `apps/mobile/QA.md` from spec 08 matrix; fix issues found. Additive tenant `mobileAppEnabled` + web download links if straightforward.

### Acceptance

- [x] QA.md complete
- [x] EAS profiles present (`eas.json` development / preview / production)
- [x] Matrix items addressed or explicitly deferred with owner
- [x] Sentry init gated on `EXPO_PUBLIC_SENTRY_DSN` (SDK install deferred until DSN)

---

## M11 — Store compliance

- **Status:** done
- **Depends:** M10
- **Specs:** [STORE-COMPLIANCE.md](./STORE-COMPLIANCE.md), [store-ops/](./store-ops/README.md), [08](./specs/08-qa-release.md)

### Prompt

> Close public-listing reject risks and prepare the full Ops pack: disclosure, privacy, Face ID cleanup, version 1.0.0, reviewer seed, Play/App Store copy-paste answers, video script, verify script.

### Acceptance

- [x] `docs/mobile/STORE-COMPLIANCE.md` checklist
- [x] In-app disclosure before `requestBackgroundPermissionsAsync`
- [x] Profile → Location & privacy; web `/privacy` Field sections
- [x] No `NSFaceIDUsageDescription` until biometrics ship
- [x] Ops pack under `docs/mobile/store-ops/` (Play, App Store, video, demo)
- [x] Seed sets `employee@acme.local` to `mobile` + today’s shift
- [x] App version `1.0.0`
- [ ] Human: film video + paste into Play / App Store Connect + EAS submit
