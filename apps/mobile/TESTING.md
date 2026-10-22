# Elevora Field — simulator testing (M6)

## Prerequisites

- API running (`http://127.0.0.1:4000`) with mobile routes and seeded `acme`
- Demo login: workspace `acme` · `employee@acme.local` · `Employee123!`
- Web preview: Metro on `:8081` proxies `/v1` → API (port-forward friendly)
- Native: development build (`expo-dev-client`) — background location and geofencing need a custom build, not Expo Go alone

## Web (Metro)

1. `pnpm --filter @hr/mobile exec expo start --web --port 8081`
2. Open `http://localhost:8081/workspace`, enter `acme`, Continue
3. Sign in with the demo employee
4. Clock check uses browser geolocation; if denied, the app falls back to the zone center (marked “fallback”)
5. Location batch still runs while on shift via `watchPosition` (foreground only on web)

## iOS Simulator — simulated location

1. Run a development build on the Simulator
2. **Features → Location → Custom Location…** (or Apple campus / City Run)
3. Set coordinates **inside** the employee geofence (check Sync / `/v1/mobile/me` → `zones[0]`)
4. Clock in → Today should show **Tracking** and **Inside · N m**
5. Change location to a point clearly outside the radius → fixed-zone staff see **Outside work zone**; clock-in is blocked
6. Background: send app to background after clock-in (mobile-presence). Confirm the blue status bar / “On shift · tracking location” notification behavior on device; Simulator background updates are limited

### Geofence tip

For a quick outside test, set Custom Location ~200 m beyond `zones[0].radiusMeters` from the zone center.

## Android Emulator — simulated location

1. Open **Extended controls → Location**
2. Set a single point inside the zone, clock in
3. Use **GPX / KML** routes or step the point outside the radius to exercise Outside + geofence exit events
4. Grant **Allow all the time** when prompted if testing background updates
5. Confirm foreground service notification: “On shift · tracking location”

## Overtime notifications

1. Ensure a shift instance with a near-future `endAt` is present via sync pull
2. Clock in — app schedules local notifications at shift end and grace−2 min
3. On Simulator: **Features → Trigger notification** is not required; wait for the scheduled time or temporarily set `endAt` close to now in DB for a faster check
4. Tapping the notification should open `/modal/overtime` (Stay / Decline / Clock out)

## Location batch

- Points buffer in SQLite (`location_points`) on native, memory on web
- Flush every **2 minutes** or **100 points** to `POST /v1/mobile/locations/batch`
- Clock-out, overtime decline, and sign-out call `stopTracking()` which flushes remaining points

## Maps (M7)

1. Open the **Map** tab — Me shows work zone + you marker (web uses MapLibre; demotiles fallback if Elevora styles are unreachable)
2. **My team** polls `/v1/mobile/team/presence` every 30s (WebSocket preferred when `/ws` is reachable)
3. **Offline maps** → Download work zone or pick a custom area; packs persist in SecureStore metadata (native OfflineManager when linked)

## Quick API checks

```bash
# Workspace (via Metro proxy)
curl -sS -X POST http://127.0.0.1:8081/v1/mobile/auth/workspace \
  -H 'content-type: application/json' -d '{"slug":"acme"}'

# Health
curl -sS http://127.0.0.1:8081/health
```
