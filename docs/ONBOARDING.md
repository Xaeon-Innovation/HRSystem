# Tenant onboarding runbook

1. Sign in as platform super admin (`superadmin@hr.local`).
2. Open **Tenants** and provision:
   - Organization name
   - Unique slug (used at login)
   - Initial tenant admin credentials
3. New tenants start on the **Trial** plan (14 days, seat limit from catalog).
4. Tenant admin signs in with email + password + slug.
5. Configure tenant settings from the tenant detail page or `PATCH /v1/tenants/:id` (timezone, ping interval 15–30s, retention 30–90 days).
6. Import employees via CSV (`name,email,role,jobTitle`) or create individually (seat limits enforced).
7. Tenant admin upgrades via **Billing** (`/app/billing`) once Paymob is configured (see [BILLING.md](./BILLING.md)).
8. Optionally define KPI templates and assign to employees.
9. Employees install the PWA (Add to Home Screen) and enable location for clock-in.

## Platform console (super_admin)

- **Tenants** — provision, suspend, soft-delete, settings
- **Plans** — catalog + optional Paymob sync
- **Subscriptions** — cross-tenant status / overrides
- **Audits** — platform + tenant-admin sensitive actions
- **Health** — cross-tenant health metrics

## Suspension / offboarding

- Suspend: `PATCH /v1/tenants/:id` with `{ "status": "suspended" }` — logins blocked.
- Soft delete: `DELETE /v1/tenants/:id` — status `deleted`.
- Payment failures (Paymob) can auto-suspend after repeated charge failures.
- Data export/deletion for privacy requests: export via SQL/CSV reports; hard purge is a controlled ops procedure (see PRIVACY.md).
