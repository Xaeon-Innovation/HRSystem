# 03 — Screen map (prototype → Expo Router)

Prototype registry lives in [`design/elevora-mobile-prototype/app.js`](../../../design/elevora-mobile-prototype/app.js). Match layout and copy; wire real data via SQLite hooks.

| Prototype id | Title | Route |
|---|---|---|
| `splash` | Splash | `app/index.tsx` |
| `workspace` | Find your workspace | `app/(auth)/workspace.tsx` |
| `signin` | Sign in | `app/(auth)/sign-in.tsx` |
| `unlock` | Quick unlock | `app/(auth)/unlock.tsx` |
| `perms` | Permissions | `app/(onboarding)/permissions.tsx` |
| `download` | Get offline map | `app/(onboarding)/offline-map.tsx` |
| `today` | Today (before shift) | `app/(tabs)/index.tsx` (state: off) |
| `verify` | Clock-in check | `app/modal/clock-check.tsx` |
| `today-on` | On shift | `app/(tabs)/index.tsx` (state: on) |
| `today-break` | On break | `app/(tabs)/index.tsx` (state: break) |
| `outside` | Outside the zone | Today state / overlay (fixed_zone only) |
| `overtime` | Overtime prompt | `app/modal/overtime.tsx` |
| `offline` | Offline mode | Today + `OfflineBanner` + SyncPill |
| `map` | Map | `app/(tabs)/map.tsx` |
| `map-team` | Team map | `app/(tabs)/map.tsx?view=team` |
| `offline-maps` | Offline maps | `app/offline-maps/index.tsx` |
| `map-select` | Choose area | `app/offline-maps/new.tsx` |
| `shifts` | My shifts | `app/(tabs)/shifts.tsx` |
| `shift` | Shift detail | `app/shifts/[id].tsx` |
| `leave` | Leave | `app/(tabs)/leave.tsx` |
| `leave-new` | New leave request | `app/leave/new.tsx` |
| `leave-detail` | Request detail | `app/leave/[id].tsx` |
| `approvals` | Approvals | `app/leave/approvals.tsx` |
| `tasks` | My tasks | `app/(tabs)/tasks.tsx` |
| `task` | Task detail | `app/tasks/[id].tsx` |
| `history` | History | `app/history.tsx` |
| `alerts` | Alerts | `app/alerts.tsx` |
| `sync` | Sync center | `app/sync.tsx` |
| `more` | Profile & more | `app/profile.tsx` |
| `team` | Team today | `app/team.tsx` |

## Tab bar

Default five: Today, Map, Shifts, Tasks, Leave — gated by entitlements from `/me`. Also: change-password route `(auth)/change-password.tsx`.

## Auth / onboarding chain

`splash` → `workspace` → `signin` → (`change-password`) → `unlock` → `perms` → `download` → `today`.
