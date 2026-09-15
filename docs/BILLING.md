# Billing (Polar)

Elevora sells multi-tenant subscriptions via **[Polar](https://polar.sh)** (Checkout Sessions + seat-based products). Paymob columns remain in the database for legacy rows but are **not** used on the live checkout path.

Polar’s native “seats” are Polar team members who claim benefits. Elevora seats are **active employees**. We use Polar only as the **billed quantity** (`subscription.seats` → `purchased_seats` → employee cap). We do **not** assign employees as Polar members or grant Polar benefits.

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

- **Field / People:** fixed monthly price only. Elevora `seat_limit` stays 25.
- **Ops / Scale:** fixed floor **plus** graduated seat-based price:
  - Ops: seats 25–50 @ $0, 51–100 @ $6
  - Scale: seats 100–150 @ $0, 151–250 @ $4.50

Checkout passes `seats` for Ops/Scale. That number is stored as `tenant_subscriptions.purchased_seats` and becomes the employee cap.

Quote math lives in `@hr/shared` (`SEAT_QUOTES`) so marketing, checkout validation, and Polar sync stay aligned.

**Enterprise** is not self-serve: `amountCents = 0`, checkout is blocked, CTA is `/demo`.

## Feature gates

Boolean keys on `plans.features` (see `PLAN_FEATURE_KEYS`):

- `fieldOps` — live map, team today, location WebSocket pings
- `peopleOps` — leave, KPIs, hiring, compensation routes
- `analytics` — `/v1/analytics/*`
- `integrations` — `/v1/integrations/*`

Numeric limits: `pingIntervalSec`, `locationRetentionDays`, `trialDays`.

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
7. Cancel at period end via Elevora or Polar Customer Portal (`POST /v1/billing/portal`).
8. `subscription.revoked` suspends the tenant.

Platform admin can still provision tenants with a trial via `POST /v1/tenants`.

## Seat limits

Active employee count is enforced against `purchased_seats` when set, otherwise `plans.seat_limit`. `null` means unlimited (Enterprise / sales overrides only).

## Manual overrides

Super admins can cancel or force-activate subscriptions under `/app/subscriptions`.

## Smoke checklist

1. Set `POLAR_*` env (sandbox recommended).
2. As super admin, open `/app/plans` → **Sync all to Polar**.
3. As tenant admin, open `/app/billing`, pick Ops with a seat slider, start checkout.
4. Complete payment with a Polar/Stripe test card in sandbox.
5. Confirm webhook updates status to `active` and `purchased_seats` matches the slider.
6. Change seats in-app; confirm Polar prorates and the employee cap updates.
7. Confirm Field-only tenants cannot open Live Map or Leave.
