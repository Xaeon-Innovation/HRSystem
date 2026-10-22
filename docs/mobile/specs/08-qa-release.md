# 08 — QA and release

## Device matrix (must pass on real iPhone + mid-range Android)

- [ ] Airplane mode full shift: clock in, break, leave zone during break, clock out → single ordered sync with server dedupe.
- [ ] Force-quit while on shift: tracking continues (Android FGS / iOS significant), OT notification fires, correct state on reopen.
- [ ] Manual device time change offline → `time_suspect`.
- [ ] Android mock location → blocked on device and server.
- [ ] Fixed-zone 300 m away → Outside screen; mobile presence clocks in anywhere.
- [ ] Leave created offline, approved on web → Approved + balance after pull.
- [ ] Task edited on web while phone changes status offline → Sync center conflict; both choices work.
- [ ] Session revoked while offline → queue kept; same user re-login flushes; different user cannot steal queue.
- [ ] Module disabled → tab gone after next `/me`.
- [ ] Arabic: full RTL, Plex Arabic; numbers/time bars/map not mirrored.
- [ ] Dark mode every screen including map style.
- [ ] Battery: ~9 h tracked shift under ~10–12% on test Android (tune intervals).
- [ ] Offline map: zone + route render with no network after pack download.

## Store readiness

- **iOS:** Always-location purpose strings (shift-only), background modes, privacy manifest, App Review demo account.
- **Android:** Play background location declaration + disclosure video, FGS type `location`, data safety form.
- **EAS:** `development`, `preview`, `production` + Update channels; semver `version`, auto `buildNumber`/`versionCode`.
- **Flag:** tenant `mobileAppEnabled` (default on for field-ops); web settings show download links when on.

## Deliverables on M10

- Sentry wired (tenant, device, app version tags).
- Empty / loading / error states on every screen.
- `apps/mobile/QA.md` with this matrix + how to run each test.
- EAS profiles committed.
