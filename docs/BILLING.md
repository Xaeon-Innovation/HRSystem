# Billing (Paymob)

HR Track sells multi-tenant subscriptions via **Paymob Accept** (Subscriptions Module + Intention checkout), with **international card** acquiring enabled on the merchant account.

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

## Flows

1. **Platform admin** creates/activates plans under `/app/plans`. Paid plans can sync to Paymob subscription plans (`paymob_plan_id`).
2. **Tenant provision** assigns a **trial** subscription automatically.
3. **Tenant admin** opens `/app/billing`, picks a plan, and is redirected to Paymob unified checkout (first charge is customer-initiated).
4. Paymob sends subscription webhooks (`charge`, `cancel`, `failure`, `retry`). HMAC is verified as `{trigger_type}for{subscription_id}` (SHA-512).
5. After repeated `failure` events (≥3), the tenant is **suspended**.

## Seat limits

Active employee count is enforced against `plans.seat_limit` on create/import/reactivate. `null` means unlimited (enterprise).

## Manual overrides

Super admins can cancel or force-activate subscriptions under `/app/subscriptions` for support cases.

## Smoke checklist

1. Log in as a **tenant admin**.
2. Open `/app/billing`, current plan and seat summary load.
3. Confirm the **available plan list** is shown.
4. Start **checkout** on a paid plan, requires Paymob env (`PAYMOB_*`); without it, checkout returns `503`.
