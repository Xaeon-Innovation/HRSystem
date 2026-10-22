# 04 — Clock, geofence, tracking

Prototype screens: `today`, `verify`, `today-on`, `today-break`, `outside`, `overtime`, `offline`.

## Clock flow

1. Today keeps a foreground location watch (~10s / 10m) while open; show Inside/Outside + distance.
2. Clock in → `modal/clock-check`: location found → accuracy → inside zone (`packages/geo`) → not mocked → send/save.
3. Online: push immediately; server time official. Offline: outbox + “Saved on this phone”.
4. Fixed-zone outside: Outside screen (distance, walk hint, GPS tips, Try again). **No client override.**
5. Clock out / break start/end / overtime use the same pattern.

## Geo rules (`packages/geo`)

Shared by mobile pre-check and API validation. Current API uses plain `distance <= radius` ([`apps/api/src/lib/geo.ts`](../../../apps/api/src/lib/geo.ts)). Target (from product plan):

- Strict (default): inside if `distance + min(accuracy, 50) <= radius`.
- Lenient (tenant setting): `distance <= radius`.
- Reject low accuracy / mocked when policy requires.

Presence `mobile` skips geofence for clock-in.

## Background tracking

- Start at clock-in only if field-ops / live-map entitlement is on.
- **mobile** presence: `startLocationUpdatesAsync` — balanced, ~50m / 60s; Android foreground notification “On shift · tracking location”.
- **fixed_zone**: `startGeofencingAsync` on employee zone; enter/exit → `zone.enter` / `zone.exit`. During open break, exits are break exits (no left-zone incident).
- Points → SQLite → `/v1/mobile/locations/batch` every 2 min or 100 points.
- Stop on clock-out, auto clock-out, sign-out. Never track outside a shift. Show Tracking chip when active.
- Local notifications at shift end and grace−2min so overtime works offline.

## Overtime

`overtime.stay` / `overtime.decline` follow existing grace logic in shift/attendance services. No decision by end of grace → server auto clock-out.

## Testing notes (for `apps/mobile/TESTING.md` later)

Document iOS Simulator / Android Emulator simulated locations; airplane-mode full shift; mock-location Android block.
