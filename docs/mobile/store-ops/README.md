# Store Ops — submit pack

Copy-paste answers and scripts for Google Play and App Store Connect. In-app blockers are covered in [`../STORE-COMPLIANCE.md`](../STORE-COMPLIANCE.md).

## Order of operations

| Step | Action | Doc |
| ---: | --- | --- |
| 1 | Ensure reviewer demo on staging/prod API (`pnpm db:seed` or verify script) | [REVIEWER-DEMO.md](./REVIEWER-DEMO.md) |
| 2 | Film background-location video on a real Android device | [VIDEO-SCRIPT.md](./VIDEO-SCRIPT.md) |
| 3 | EAS production build `1.0.0` → Play internal + TestFlight | Commands below |
| 4 | Fill Play Data safety + background location + content rating | [PLAY.md](./PLAY.md) |
| 5 | Fill App Privacy + listing + Review notes | [APP-STORE.md](./APP-STORE.md) |
| 6 | Submit for review | Consoles |

## Privacy policy URL (both stores)

```
https://elevora.xaeons.com/privacy
```

Override with `EXPO_PUBLIC_PRIVACY_URL` if the marketing host differs.

## EAS production build

`eas` is **not** a global shell command on this host — use the package binary from `apps/mobile` (requires Expo login + Apple/Google credentials):

```bash
cd /opt/hr-system/apps/mobile
pnpm exec eas login                    # once
pnpm exec eas build --platform all --profile production
# After builds succeed:
pnpm exec eas submit --platform android --profile production
pnpm exec eas submit --platform ios --profile production
```

Or from the monorepo root:

```bash
pnpm --filter @hr/mobile build:production -- --platform all
```

App version is `1.0.0` in `apps/mobile/app.config.ts` (`appVersionSource: remote` in `eas.json` — set store version in EAS/App Store Connect to match).

## Reviewer credentials (shared)

| Field | Value |
| --- | --- |
| Workspace | `acme` |
| Email | `employee@acme.local` |
| Password | `Employee123!` |
| Presence | `mobile` (seeded for Always / all-the-time tracking demo) |

Admin (not for store reviewers): `admin@acme.local` / `Admin123!`

## Human-only remaining

These cannot be completed from the repo — paste from the linked docs into the consoles:

- [ ] Upload AAB / IPA via EAS submit
- [ ] Upload Play declaration video
- [ ] Click through Play Data safety + content rating
- [ ] Paste App Store description + Review notes + App Privacy
- [ ] Confirm staging/prod API is reachable from the store build (`elevora-api.xaeons.com` or staging)
