# Data retention & privacy

## Location pings

- Raw `location_pings` retained per tenant setting `locationRetentionDays` (default 60, range 30–90).
- Hourly job purges pings older than the window.
- Clock-in/out lat/lng snapshots on `attendance_records` are retained long-term with attendance history.

## Live locations

- `employee_live_locations` holds only the latest position for map performance.
- Streaming stops on clock-out; `is_clocked_in` is set false; the last coordinates remain as last-seen on the live map.
- Clock-in and clock-out also write a `location_pings` row so History review includes shift boundaries.

## Multi-tenant isolation

- Every business row includes `tenant_id`.
- API middleware requires tenant-scoped JWT for business routes.
- WebSocket map rooms are `tenant:{id}:map` only.

## Egypt / labor-law notes

- Continuous tracking should be disclosed in employment policy.
- Tenant admins can configure retention; platform ops can purge on request.
- Prefer BYOD consent + clear purpose limitation (attendance & field safety).

## Notifications

- Delivery failures are tracked via `notifications.delivery_status` and `health_metrics`.
- FCM server key optional (`FCM_SERVER_KEY`); without it, notifications are stored as `delivered_local`.

## Audit logs

- `audit_logs` records platform actions and tenant-admin sensitive actions (tenant CRUD, employee changes, attendance corrections, announcements, billing, admin logins).
- Employee clock-in/out and GPS pings are **not** written to the audit log (they remain in attendance / location tables).
- Recommended retention: keep audits ≥ 1 year for B2B accountability; purge older rows with a controlled ops job if needed.
- Billing webhooks store provider payloads in `payment_events` for idempotency and dispute support; treat as financial records.
