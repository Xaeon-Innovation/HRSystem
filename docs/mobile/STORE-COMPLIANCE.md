# Polara Field — store compliance checklist

Pre-submit gate for App Store and Google Play. Close every **Blocker** before a public listing. Internal / TestFlight / Play internal testing may proceed with Blockers tracked.

**Ops pack (copy-paste into consoles):** [`store-ops/README.md`](./store-ops/README.md)

Related: [`apps/mobile/QA.md`](../../apps/mobile/QA.md), [spec 08](./specs/08-qa-release.md).

## Status legend

| Tag | Meaning |
| --- | --- |
| **Done** | Implemented in repo |
| **Prepared** | Copy-paste answers / scripts ready — human pastes into console |
| **Ops** | Still needs console upload / click-through |
| **Blocker** | Public submit will reject or stall |

---

## Blockers (public launch)

| # | Item | Store | Status | Owner notes |
| --- | ---: | --- | --- | --- |
| 1 | Prominent **background location** disclosure before Always | Play + Apple | **Done** | In-app `/location-disclosure` |
| 2 | Play Console **background location declaration** + video | Play | **Prepared** | [PLAY.md](./store-ops/PLAY.md) + [VIDEO-SCRIPT.md](./store-ops/VIDEO-SCRIPT.md) |
| 3 | App Review notes + demo path | Apple | **Prepared** | Paste from [APP-STORE.md](./store-ops/APP-STORE.md) |
| 4 | Public **privacy policy URL** | Both | **Done** | `https://elevora.xaeons.com/privacy` |
| 5 | No unused **Face ID** string | Apple | **Done** | Removed until biometrics |
| 6 | Play **Data safety** form | Play | **Prepared** | [PLAY.md](./store-ops/PLAY.md) |
| 7 | iOS listing battery disclaimer | Apple | **Prepared** | In description paste + purpose string |
| 8 | Account creation / deletion story | Apple | **Prepared** | Review notes + in-app privacy |
| 9 | Production build **1.0.0** | Both | **Prepared** | `app.config.ts` version `1.0.0`; run EAS |
| 10 | Reviewer demo seeded | Both | **Prepared** | `pnpm db:seed` + [REVIEWER-DEMO.md](./store-ops/REVIEWER-DEMO.md) |

---

## In-app deliverables

- [x] Location disclosure before Always permission
- [x] Profile → Location & privacy + public policy link
- [x] Web `/privacy` Field / background / accounts sections
- [x] `NSFaceIDUsageDescription` removed
- [x] Unlock without Face ID / demo PIN
- [x] Always purpose string includes battery note
- [x] Privacy manifest stub + encryption export flag
- [x] Version `1.0.0`
- [x] Seed: `employee@acme.local` → `presenceMode=mobile` + today’s shift

---

## Ops checklist (before Submit)

Full answers live under [`store-ops/`](./store-ops/). Summary:

### Google Play

1. [ ] `pnpm db:seed` on the API DB the build will hit; run `store-ops/verify-reviewer-demo.sh`
2. [ ] Film video per [VIDEO-SCRIPT.md](./store-ops/VIDEO-SCRIPT.md)
3. [ ] `eas build --profile production` → upload AAB to internal testing
4. [ ] Paste Data safety + background location answers from [PLAY.md](./store-ops/PLAY.md); upload video
5. [ ] Content rating questionnaire ([PLAY.md](./store-ops/PLAY.md))
6. [ ] Listing privacy URL `https://elevora.xaeons.com/privacy`
7. [ ] Promote to production after declarations approved

### Apple App Store

1. [ ] Same seed/verify against the API used by the iOS build
2. [ ] `eas build` / `eas submit` → TestFlight
3. [ ] Paste description, App Privacy, Review notes from [APP-STORE.md](./store-ops/APP-STORE.md)
4. [ ] Confirm no Face ID usage string in the binary
5. [ ] Submit for App Review

### Distribution alternative

Workforce-only: Apple Business Manager custom apps + Play private/managed distribution. Still keep disclosure + policy.

---

## Reviewer demo (short)

1. Workspace: `acme`
2. `employee@acme.local` / `Employee123!`
3. Permissions → Location disclosure → Continue → When In Use → Always / All the time
4. Clock in → FGS / blue location indicator
5. Profile → Location & privacy

---

## Explicit non-goals for v1 public submit

- Face ID / fingerprint unlock
- In-app account self-registration
- Advertising / ATT
