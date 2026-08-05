# Tenant onboarding runbook

1. Sign in as platform super admin (`superadmin@hr.local`).
2. Open **Tenants** and provision:
   - Organization name
   - Unique slug (used at login)
   - Initial tenant admin credentials
3. Tenant admin signs in with email + password + slug.
4. Configure tenant settings via API `PATCH /v1/tenants/:id` (timezone, ping interval 15–30s, retention 30–90 days).
5. Import employees via CSV (`name,email,role,jobTitle`) or create individually.
6. Optionally define KPI templates and assign to employees.
7. Employees install the PWA (Add to Home Screen) and enable location for clock-in.

## Suspension / offboarding

- Suspend: `PATCH /v1/tenants/:id` with `{ "status": "suspended" }` — logins blocked.
- Soft delete: `DELETE /v1/tenants/:id` — status `deleted`.
- Data export/deletion for privacy requests: export via SQL/CSV reports; hard purge is a controlled ops procedure (see PRIVACY.md).
