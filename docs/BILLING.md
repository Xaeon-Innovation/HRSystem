# Billing (Paymob)

Elevora sells multi-tenant subscriptions via **Paymob Accept** (Subscriptions Module + Intention checkout), with **international card** acquiring enabled on the merchant account.

## Prerequisites (Paymob dashboard / account manager)

1. Enable the **Subscriptions Module** on the merchant.
2. Enable **international transactions** on the card integration ID you will use.
3. Create API credentials: API key, secret key, public key, HMAC secret.
4. Note your regional base URL (`https://accept.paymob.com`, UAE, KSA, or Oman host).

## Environment

```bash
PAYMOB_BASE_URL=https://accept.paymob.com
PAYMOB_API_KEY=...
PAYMOB_SECRET_KEY=...
PAYMOB_PUBLIC_KEY=...
PAYMOB_INTEGRATION_ID=123456   # international card integration
PAYMOB_HMAC_SECRET=...
PAYMOB_CURRENCY=USD
WEB_APP_URL=https://app.example.com
API_PUBLIC_URL=https://api.example.com
```

Webhook URL to register with Paymob: `{API_PUBLIC_URL}/v1/webhooks/paymob`

Without these variables, plan catalog and trial subscriptions still work; checkout returns `503`.

## Catalog (Field vs People)

Plans are flat monthly fees with **included seat bands** (not per-seat metering). Feature packs and GPS limits live on `plans.features`.

| Code | Price | Seats | Packs | GPS floor | Retention ceiling |
|------|-------|-------|-------|-----------|-------------------|
| `trial` | Free (14 days) | 10 | Field + People + Analytics | 60s | 30 days |
| `field` | $119/mo | 25 | Field ops | 60s | 30 days |
| `people` | $89/mo | 25 | People ops | — | 30 days |
| `ops` | $249/mo | 50 included (quote 25–100) | Field + People + Analytics | 30s | 60 days |
| `scale` | $599/mo | 150 included (quote 100–250) | All packs + Integrations | 20s | 90 days |
| `enterprise` | Sales only | 150+ custom | All packs + SLA | 15s | custom |

### Marketing seat quotes (Ops / Scale)

The pricing page uses **floor + overage**, not linear $/seat (which undercuts higher tiers):

- **Ops:** $249 for any selection ≤50 seats; then **+$6/seat** up to 100 (max quote $549).
- **Scale:** starts at **100** seats so it never competes at Ops headcounts; $599 for ≤150; then **+$4.50/seat** up to 250.

That keeps Field ($119) + People ($89) = $208 below Ops ($249), and Ops at 100 ($549) below Scale’s floor ($599).

**Field ops**: GPS clock-in, live map, team today, continuous location trail while clocked in.

**People ops**: leave, KPIs, hiring, compensation.

**People** plan still allows clock-in/out for attendance books, but **not** live map or GPS streaming.

**Enterprise** is not self-serve: `amountCents = 0`, checkout is blocked, CTA is `/demo`. Do not sell unlimited seats on a public price card. Sales floor is roughly **$8–12 per field seat** or **$999+/mo**.

Legacy `starter` / `pro` codes remain in the DB as **inactive** so existing subscriptions still resolve; they are hidden from the public catalog.

## Feature gates

Boolean keys on `plans.features` (see `PLAN_FEATURE_KEYS`):

- `fieldOps` — live map, team today, location WebSocket pings
- `peopleOps` — leave, KPIs, hiring, compensation routes
- `analytics` — `/v1/analytics/*`
- `integrations` — `/v1/integrations/*`

Numeric limits on the same JSON:

- `pingIntervalSec` — minimum ping interval (higher = fewer pings). Tenant settings cannot go below this floor.
- `locationRetentionDays` — maximum retention. Tenant settings cannot exceed this ceiling.
- `trialDays` — trial metadata

## Flows

1. **Platform admin** creates/activates plans under `/app/plans`. Paid plans can sync to Paymob subscription plans (`paymob_plan_id`).
2. **Tenant provision** assigns a **trial** subscription automatically (both packs, no integrations, 60s GPS).
3. **Tenant admin** opens `/app/billing`, picks a billable plan (`amountCents > 0`), and is redirected to Paymob unified checkout (first charge is customer-initiated).
4. Paymob sends subscription webhooks (`charge`, `cancel`, `failure`, `retry`). HMAC is verified as `{trigger_type}for{subscription_id}` (SHA-512).
5. After repeated `failure` events (≥3), the tenant is **suspended**.

## Seat limits

Active employee count is enforced against `plans.seat_limit` on create/import/reactivate. `null` means unlimited and is reserved for **Enterprise / sales overrides**, not public self-serve SKUs.

## Manual overrides

Super admins can cancel or force-activate subscriptions under `/app/subscriptions` for support cases.

## Smoke checklist

1. Log in as a **tenant admin**.
2. Open `/app/billing`, current plan and seat summary load.
3. Confirm the **available plan list** shows Field / People / Ops / Scale (not Trial or Enterprise).
4. Start **checkout** on a paid plan, requires Paymob env (`PAYMOB_*`); without it, checkout returns `503`.
5. Confirm a Field-only tenant cannot open Live Map or Leave; People-only cannot open Live Map.
