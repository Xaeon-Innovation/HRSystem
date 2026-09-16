# Integrations catalog roadmap (marketing + engineering)

**Status:** Plan for later — not an implementation commitment.  
**Audience:** Product, marketing, engineering.  
**Related:** [HR-GOAL-INTEGRATION.md](./HR-GOAL-INTEGRATION.md), [HR-HUBSPOT-INTEGRATION.md](./HR-HUBSPOT-INTEGRATION.md), [API.md](./API.md), connector packs in `apps/api/src/integrations/presets/`.

---

## Goal

Maximize marketing impact (“we connect to the tools your team already uses”) without shipping dozens of half-broken Connect buttons.

**Principle:** A logo is only “Supported” when a tenant can connect and sync without API wiring. Everything else is **Coming soon**, **Custom REST**, or **via Zapier/Make**.

---

## Current state (already shipped)

| Pack / path | Status | Notes |
|-------------|--------|--------|
| CMS Goals (`creative_cms_goals`) | Live | Service-account JWT; goals → scorecard / Analytics |
| HubSpot CRM (`hubspot_crm`) | Live (needs env OAuth) | Deals → `canonical_sales_event` |
| Custom REST / webhook / CSV | Live | Power-user / long-tail |
| ERP pack | Coming soon stub | Catalog only |
| Connector-pack registry + OAuth2 | Live | New vendors = new preset files |

---

## Messaging rules (marketing)

| Claim | Allowed when |
|-------|----------------|
| “Connect HubSpot / CMS Goals” | Pack is live and documented |
| “Salesforce, Zoho, Odoo, …” on a logo wall | Labeled **Coming soon** or **Request access** until live |
| “Connect any system with an API” | Always (Custom REST / webhook / CSV) |
| “5,000+ apps” | Only after Zapier/Make (or similar) partnership ships |

Do **not** list a vendor as supported in pricing/landing copy until Connect works end-to-end.

---

## Target UX (Integrations page)

1. **Ready** — live packs (CMS Goals, HubSpot, …).
2. **Coming soon** — logo grid of planned vendors (disabled CTA or “Notify me” / “Coming soon”).
3. **Advanced** — Custom REST / webhook / CSV (collapsed).
4. Later: **Ecosystem** — “Connect via Zapier” card.

Marketing screenshots should show the full Coming soon grid even before packs are built.

---

## Proposed Coming soon logo set (v1 wall)

Prioritize names that UAE / SMB / mid-market buyers recognize. Order is marketing priority, not build order.

### CRM

- Salesforce  
- Zoho CRM  
- Pipedrive  
- Microsoft Dynamics 365  
- Freshsales  

### ERP / finance

- Odoo  
- Oracle NetSuite  
- SAP (Business One / S/4 via API — phrase carefully)  
- Xero  
- QuickBooks Online  
- Zoho Books  
- ERPNext  

### Work / goals / tickets

- Jira  
- Asana  
- Monday.com  
- Notion  
- ClickUp  

### Optional later (HR directory)

- BambooHR  
- Personio  

Exact list can shrink for the first UI wall (aim for **10–12 logos** on the page; keep the rest in this doc).

---

## Engineering build order (when we execute)

Each live vendor follows the same recipe:

1. Short vendor doc under `docs/` (auth, endpoints, identity key, field map).  
2. Preset under `apps/api/src/integrations/presets/`.  
3. Register in `registry.ts` + catalog.  
4. Map into existing canonical entities.  
5. Integrations card goes from Coming soon → Ready.

### Suggested sequence

| Priority | Pack | Auth | Canonical sink | Why |
|----------|------|------|----------------|-----|
| P0 | Catalog Coming soon UI + logo set | — | — | Marketing screenshots / sales decks |
| P1 | Salesforce CRM | OAuth2 | `canonical_sales_event` | Enterprise credibility |
| P1 alternate | Zoho CRM | OAuth2 | `canonical_sales_event` | Strong regional SMB fit |
| P2 | Odoo ERP | API key / OAuth | sales + optional job/task | One ERP logo that is buildable |
| P2 alternate | Xero | OAuth2 | `canonical_sales_event` | Finance / invoice story |
| P3 | Jira or Asana | OAuth2 | `canonical_task_event` | “Work completed” KPIs |
| P4 | Zapier / Make | Outbound webhook or thin app | raw → canonical or push events | Logo count explodes without N native packs |

Revisit P1 choice (Salesforce vs Zoho) based on current pipeline / ICP before building.

---

## Zapier / Make (ecosystem multiplier)

**When:** After ≥2–3 native packs feel solid.  
**What:** Either:

- Documented **inbound webhook** + field mapping template for Zapier, and/or  
- Official Zapier app: triggers/actions that write into Elevora webhooks.

**Marketing line:** “Native connectors for CMS Goals and HubSpot, plus thousands of apps via Zapier.”

---

## Out of scope for this roadmap

- AI auto-mapping / no-code formula builders  
- Building every logo on the wall as a native pack  
- Claiming SAP/Workday “full ERP” without a scoped API surface  
- Changing the raw → canonical pipeline (already correct)

---

## Success criteria (later review)

- [ ] Landing / sales can show a credible Integrations logo wall with clear Supported vs Coming soon.  
- [ ] At least one additional live CRM or ERP pack beyond HubSpot.  
- [ ] Custom REST remains the honest long-tail answer.  
- [ ] Optional: Zapier path documented or live.  
- [ ] No vendor marked Supported without a working Connect + sync path.

---

## Open decisions (resolve before build)

1. **Next live pack:** Salesforce vs Zoho (or other)?  
2. **Coming soon wall size:** 10 logos vs 20?  
3. **Notify me:** collect emails / GitHub issues / ignore until pack ships?  
4. **Zapier timing:** after P1 only, or parallel with P2?

---

## Document history

- Created as a planning artifact so product/marketing/engineering can revisit without re-deriving strategy from chat.
