# HubSpot CRM connector

No-code pack: **HubSpot CRM** (`hubspot_crm`). Tenants sign in with HubSpot OAuth; Polara refreshes tokens and maps deals into `canonical_sales_event`.

## Server setup

1. Create a HubSpot public app with redirect URL:
   `{API_PUBLIC_URL}/v1/integrations/oauth/callback`
2. Scopes: `crm.objects.deals.read`, `oauth`
3. Set env:
   - `HUBSPOT_CLIENT_ID`
   - `HUBSPOT_CLIENT_SECRET`
   - `API_PUBLIC_URL` / `WEB_APP_URL` (callback + post-connect redirect)

## Tenant flow

1. Integrations → **Connect HubSpot CRM**
2. `POST /v1/integrations/oauth/start` creates a draft connection and returns `authorizeUrl`
3. After HubSpot consent, `GET /v1/integrations/oauth/callback` stores tokens and activates the connection
4. Poll sync pulls `/crm/v3/objects/deals` (amount, stage, close date, owner)

## Identity

Map HubSpot `hubspot_owner_id` to HR employees via **external employee links** (or set employee external IDs to that owner id).

## Field map (default)

| Source | Canonical |
|--------|-----------|
| `id` | `external_record_id` |
| `properties.hubspot_owner_id` | `employee_external_key` |
| `properties.amount` | `amount` |
| `properties.dealstage` | `status` |
| `properties.closedate` | `event_date` |
