# Tenant onboarding runbook

1. Sign in as platform super admin (`superadmin@hr.local`).
2. Open **Tenants** and provision:
   - Organization name
   - Unique slug (used at login)
   - Initial tenant admin credentials
3. Platform-provisioned tenants start on the **Trial** plan (14 days, seat limit from catalog). Self-serve paths:
   - `/signup` (no plan) → 14-day trial once
   - `/pricing` **Start now** → signup with `?plan=` → Polar checkout, **no trial**, features after payment
4. Tenant admin signs in with email + password + slug.
5. Configure tenant settings from the tenant detail page or `PATCH /v1/tenants/:id` (timezone, ping interval 15–30s, retention 30–90 days).
6. Import employees via CSV (`name,email,role,jobTitle`) or create individually (seat limits enforced).
7. Tenant admin upgrades or completes checkout via **Billing** (`/app/billing`) once Polar is configured (see [BILLING.md](./BILLING.md)).
8. Optionally define KPI templates and assign to employees.
9. Employees install the PWA (Add to Home Screen) and enable location for clock-in.

## Platform console (super_admin)

- **Overview** (`/app`) — MRR estimate, fleet counts, recent leads/payments; CTA to open a workspace for full product testing
- **Tenants**, provision, suspend, soft-delete, settings, **feature overrides** (Inherit / On / Off), **Open workspace** (keeps `super_admin` + enters tenant context with all gates unlocked)
- **Subscriptions**, cross-tenant status / overrides (cancel suspends; force-active unsuspends)
- **Leads**, demo requests + signup funnel inbox
- **Plans**, catalog edit (feature packs + limits) + Polar create/update sync
- **Features** (`/app/features`), plan×pack matrix and tenants with overrides (`GET /v1/platform/features`)
- **Payments**, webhook/payment event browser
- **Audits**, platform + tenant-admin sensitive actions
- **Health**, cross-tenant health metrics

## Suspension / offboarding

- Suspend: `PATCH /v1/tenants/:id` with `{ "status": "suspended" }`, logins blocked.
- Soft delete: `DELETE /v1/tenants/:id`, status `deleted`.
- Force-active on a subscription (`PATCH /v1/subscriptions/:id` `{ status: "active" }`) also sets tenant `active` when suspended. It does not recreate Polar billing.
- Trial expiry sets subscription `expired` but does **not** suspend the tenant (Billing stays reachable).
- Payment failures (Polar `past_due` / revoke) can suspend tenant access.
- Data export/deletion for privacy requests: export via SQL/CSV reports; hard purge is a controlled ops procedure (see PRIVACY.md).
