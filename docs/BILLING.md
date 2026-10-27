# Billing (Polar)

Polara sells multi-tenant subscriptions via **[Polar](https://polar.sh)** (Checkout Sessions + seat-based products). Paymob columns remain in the database for legacy rows but are **not** used on the live checkout path.

Polar’s native “seats” are Polar team members who claim benefits. Polara seats are **active employees**. We use Polar only as the **billed quantity** (`subscription.seats` → `purchased_seats` → employee cap). We do **not** assign employees as Polar members or grant Polar benefits.

## Prerequisites (Polar dashboard)

1. Create an organization on [polar.sh](https://polar.sh) (use [sandbox.polar.sh](https://sandbox.polar.sh) for testing).
2. Create an **organization access token** (Settings → Developers) with scopes for products, checkouts, subscriptions, customers, customer sessions, and webhooks.
3. Create a webhook endpoint pointing at `{API_PUBLIC_URL}/v1/webhooks/polar` and copy the signing secret.
4. Recommended webhook events: `subscription.created`, `subscription.updated`, `subscription.active`, `subscription.canceled`, `subscription.revoked`, `subscription.past_due`, `order.paid`, `checkout.updated`.

## Environment

```bash
POLAR_ACCESS_TOKEN=polar_oat_...
POLAR_WEBHOOK_SECRET=whsec_...
POLAR_SERVER=sandbox   # or production
WEB_APP_URL=https://app.example.com
API_PUBLIC_URL=https://api.example.com
```

Without `POLAR_ACCESS_TOKEN`, the plan catalog and trials still work; checkout returns `503`.

## Catalog

| Code | Price | Seats | Packs | GPS floor | Retention ceiling |
|------|-------|-------|-------|-----------|-------------------|
| `trial` | Free (14 days) | 10 | Field + People + Analytics | 60s | 30 days |
| `field` | $119/mo | 25 (fixed) | Field ops | 60s | 30 days |
| `people` | $89/mo | 25 (fixed) | People ops | — | 30 days |
| `ops` | $249/mo + overage | 25–100 (Polar seats) | Field + People + Analytics | 30s | 60 days |
| `scale` | $599/mo + overage | 100–250 (Polar seats) | All packs + Integrations | 20s | 90 days |
| `enterprise` | Sales only | custom | All packs + SLA | 15s | custom |

### Polar product shape

Created via **Sync all to Polar** (`POST /v1/plans/sync-polar`) or per-plan `syncPolar: true`:

- **Field / People:** fixed monthly price only. Polara `seat_limit` stays 25.
- **Ops / Scale:** fixed floor **plus** graduated seat-based price:
  - Ops: seats 25–50 @ $0, 51–100 @ $6
  - Scale: seats 100–150 @ $0, 151–250 @ $4.50

Checkout passes `seats` for Ops/Scale. That number is stored as `tenant_subscriptions.purchased_seats` and becomes the employee cap.

Quote math lives in `@hr/shared` (`SEAT_QUOTES`) so marketing, checkout validation, and Polar sync stay aligned.

**Enterprise** is not self-serve: `amountCents = 0`, checkout is blocked, CTA is `/demo`.

## Feature gates

Boolean **module** keys on `plans.features` (see `MODULE_KEYS` / `PLAN_FEATURE_KEYS` in `@hr/shared`):

| Module | Pack group | Gates |
|--------|------------|--------|
| `liveMap` | fieldOps | Live map + WS presence |
| `teamToday` | fieldOps | Team today |
| `leave` | peopleOps | Leave |
| `hiring` | peopleOps | Hiring |
| `kpis` | peopleOps | KPIs |
| `compensation` | peopleOps | Compensation |
| `analytics` | analytics | Analytics |
| `integrations` | integrations | Integrations |

Legacy pack booleans (`fieldOps`, `peopleOps`) in stored JSON are expanded into modules at resolve time.

Numeric limits: `pingIntervalSec`, `locationRetentionDays`, `trialDays`.

### Launch status

Each module has `draft` | `lab` | `ga` in `platform_modules` (edit under `/app/features`):

- `draft` — hidden from tenants
- `lab` — only Polara Lab tenant (and Unlock-all workspace)
- `ga` — normal plan/override resolution

### Effective features (plan + tenant overrides + launch)

Resolution order for tenant users:

1. Load module flags from the live subscription’s plan (`plans.features`).
2. Apply `tenant.settings.featureOverrides` when a key is explicitly `true` or `false` (inherits when absent).
3. Apply launch filter (`draft`/`lab`/`ga`).
4. Numeric limits stay plan-based (overrides do not change limits in v1).

Edit modules under `/app/plans` or the matrix at `/app/features`. Per-tenant Inherit/On/Off lives on the tenant detail page. Aggregated view: `GET /v1/platform/features`.

### Superadmin Lab + plan preview

- Seeded Lab tenant: slug `elevora-lab` (`settings.platformLab: true`).
- **Open Lab** / **Preview {plan}** on Features enter Lab with workspace mode `unlock_all` or `preview_plan`.
- In-workspace chrome: switch Unlock all / As entitled / Preview plan (live catalog).
- `GET /v1/auth/me` and enter-tenant return **effective** `planFeatures` plus `workspace` metadata.

### Enterprise sales runbook

1. Demo form → lead (`source: enterprise`) on `/app/leads`.
2. **Provision Enterprise** on the lead (or create tenant with plan = Enterprise).
3. On tenant detail: set purchased seats if needed; Inherit/On/Off modules for a custom 2–3 page experience.
4. Force-active is already applied on provision with `planCode`.

`GET /v1/auth/me` returns effective features in `planFeatures`.

## Flows

Platform admin first opens `/app/plans` → **Sync all to Polar** (stores `polar_product_id` on each billable plan).

### Trial (signup only)

1. Visitor opens `/signup` with **no** plan query → workspace is provisioned on the **Trial** plan (`trialing`, 14 days from `plans.features.trialDays`).
2. Trial includes Field + People + Analytics (10 seats). Integrations are not included.
3. An hourly job marks `trialing` rows with `trialEndsAt` in the past as `expired`. The tenant is **not** suspended — admins can still open Billing.
4. After expiry, plan features are empty and product APIs return **402**. Trial cannot be restarted (any prior subscription row blocks `startTrialForTenant`).
5. Pricing and Billing never list Trial as a purchasable plan.

### Paid Start now

1. Visitor picks a plan on `/pricing` → **Start now** → `/signup?plan=…&seats=…`.
2. Signup creates the workspace **without** a trial. Features stay locked until Polar confirms payment.
3. After signup the admin is sent to `/app/billing?checkout=…` which starts Polar Checkout.
4. `POST /v1/billing/checkout` creates a Polar session only — it does **not** change `planId` before payment.
5. Polar webhooks (`subscription.active` / updates) write `planId`, `purchased_seats`, and status. That is the only path that unlocks paid packs.
6. Seat changes: `POST /v1/billing/seats` → Polar `subscriptions.update` with proration; cannot go below active employee count.
7. Cancel at period end via Polara or Polar Customer Portal (`POST /v1/billing/portal`).
8. `subscription.revoked` suspends the tenant.

Platform admin can still provision tenants with a trial via `POST /v1/tenants`.

## Seat limits

Active employee count is enforced against `purchased_seats` when set, otherwise `plans.seat_limit`. `null` means unlimited (Enterprise / sales overrides only).

## Manual overrides

Super admins can cancel or force-activate subscriptions under `/app/subscriptions`.

- **Cancel / expire** (platform override): local status updated; Polar cancel attempted when linked; tenant is **suspended**.
- **Force active**: local subscription set to `active` and a suspended tenant is **unsuspended**. Does not recreate a Polar subscription — tenants may still need checkout to restore live billing.
- **Suspend / activate tenant** (`/app/tenants`): blocks or restores login only; activate does not invent Polar billing.

## Catalog price changes

Edit amounts under `/app/plans` (or `PATCH /v1/plans/:id`). With `syncPolar: true` (or **Sync all (update prices)**), Polara creates missing Polar products or calls Polar `products.update` so **new** checkouts see the new price. Existing Polar subscribers stay on grandfathered prices unless migrated in Polar.

## Smoke checklist

1. Set `POLAR_*` env (sandbox recommended).
2. As super admin, open `/app/plans` → **Sync all to Polar**.
3. As tenant admin, open `/app/billing`, pick Ops with a seat slider, start checkout.
4. Complete payment with a Polar/Stripe test card in sandbox.
5. Confirm webhook updates status to `active` and `purchased_seats` matches the slider.
6. Change seats in-app; confirm Polar prorates and the employee cap updates.
7. Confirm Field-only tenants cannot open Live Map or Leave.
8. Submit `/demo` and confirm a lead appears under `/app/leads`.
