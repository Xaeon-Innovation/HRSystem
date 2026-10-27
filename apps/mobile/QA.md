# Polara Field — QA matrix (M10)

Derived from the mobile release plan. Owner: Field mobile. Date: 2026-10-16.

## Environments

| Env | API | App | Notes |
| --- | --- | --- | --- |
| Local web | `127.0.0.1:4000` via Metro `:8081` `/v1` proxy | Expo web | Port-forward friendly |
| Dev client | Staging/local API | EAS `development` | MapLibre RN + bg location |
| Preview | Staging API | EAS `preview` | Internal distribution |
| Production | `elevora-api.xaeons.com` | EAS `production` | Store builds (`1.0.0`) |

Demo tenant: workspace `acme` · `employee@acme.local` · `Employee123!`  
Store review: seed sets that employee to `presenceMode=mobile` + today’s shift — see [`docs/mobile/store-ops/`](../../docs/mobile/store-ops/README.md).

## Smoke matrix

| Area | Case | Result | Notes |
| --- | --- | --- | --- |
| Auth | Workspace lookup `acme` | Pass | Metro proxy `/v1/mobile/auth/workspace` |
| Auth | Sign-in / unlock / onboarding | Pass | Web path verified |
| Sync | Pull + Sync center | Pass | Web memory outbox; native SQLite |
| Clock | Clock-check geofence | Pass | Outside screen blocks fixed-zone |
| Clock | Tracking chip on shift | Pass | Stops on clock-out / sign-out |
| Locations | Batch flush | Pass | API `POST /locations/batch` |
| Maps | Me map + zoom | Partial | MapLibre web; Polara styles fall back to demotiles |
| Maps | Offline pack download UX | Pass | Metadata store; native OfflineManager deferred |
| Team | Presence poll fallback | Pass | WS when `/ws` reachable |
| Shifts | List + detail | Pass | From sync upserts |
| Leave | Offline create “Waiting to send” | Pass | Outbox |
| Leave | Approvals gated | Pass | Manager / leaves role |
| Tasks | Status + review gated | Pass | Tasks module role |
| History | Clock sessions | Pass | |
| Alerts | Deep link routes | Pass | `lib/push.ts` map |
| Profile | Sign-out blocked if outbox pending | Pass | |
| Push | Expo token | Deferred | Device build only; web no-op |
| Sentry | Crash reporting | Deferred | Wire `@sentry/react-native` when DSN available |
| Store | In-app bg-location disclosure | Pass | `/location-disclosure` before Always; consent gated in `location-permissions` |
| Store | Location & privacy screen | Pass | Profile → Location & privacy; links `elevora.xaeons.com/privacy` |
| Store | No Face ID usage string | Pass | Removed until biometrics ship |
| Store | Play Console video + Data safety | Deferred | Ops — see `docs/mobile/STORE-COMPLIANCE.md` |
| Store | App Review notes + listing battery line | Deferred | Ops — checklist in STORE-COMPLIANCE.md |
| Tenant flag | `mobileAppEnabled` | Deferred | Additive web setting later |

## Explicit deferrals

1. **Native MapLibre OfflineManager** — requires `@maplibre/maplibre-react-native` in a custom dev client.
2. **Sentry DSN** — add when ops provides project keys; do not ship empty SDK.
3. **Polara hosted map styles** (`tiles.elevora.app`) — app probes and falls back to MapLibre demotiles.
4. **`mobileAppEnabled` + web download links** — product toggle on tenant admin; not blocking field app use.

## Regression commands

```bash
pnpm --filter @hr/mobile lint
pnpm --filter @hr/mobile test
curl -sS -X POST http://127.0.0.1:8081/v1/mobile/auth/workspace \
  -H 'content-type: application/json' -d '{"slug":"acme"}'
```

See also [TESTING.md](./TESTING.md) for simulator location steps.
