# Elevora

Multi-tenant HR and field workforce platform: clock/GPS presence, performance (KPIs and CMS goals), leave, and tenant administration.

Elevora is a Xaeon product. Support: info@xaeons.com.

## Language

**Tenant**:
An organization that uses Elevora under its own roster, settings, and subscription.
_Avoid_: Company, account, client (when meaning the org)

**Employee**:
A person on a tenant roster who may clock, appear on the map, and hold module access.
_Avoid_: User (when meaning the person record), staff member

**System module role**:
A grant (`kpis`, `leaves`, `hiring`, `compensation`) an admin gives an employee to open that module.
_Avoid_: Permission bit, feature flag (those mean other things)

**Module (entitlement)**:
A product surface gated by plan catalog + tenant overrides (`liveMap`, `teamToday`, `leave`, `hiring`, `kpis`, `compensation`, `analytics`, `integrations`).
_Avoid_: Feature pack (packs are marketing groups of modules); system module role (per-employee grant)

**Pack**:
A marketing/pricing group (`fieldOps`, `peopleOps`, `analytics`, `integrations`) that expands into modules.
_Avoid_: Module (when meaning a single gated page)

**Lab tenant**:
Platform-owned tenant (`elevora-lab`) used to preview plans and lab-launch modules without entering customer workspaces.
_Avoid_: Sandbox (Polar billing environment)

**Live presence**:
Whether someone is clocked in and/or visible on the live map right now.
_Avoid_: Online status, check-in (ambiguous with leave)

**KPI**:
A tenant-defined performance metric with a target and recorded result for a person.
_Avoid_: Goal (CMS targets are Goals/Targets from the CMS Goals integration)

**KPI target**:
The level a local KPI aims for (what the person is measured against).
_Avoid_: Goal (reserve Goal for CMS)

**KPI result**:
The recorded actual against a KPI target for a review (stored score row).
_Avoid_: Score when meaning the overall weighted performance number; Achievement when meaning % of target

**Overall performance score**:
The weighted roll-up of complete KPI results for a person (or filtered set) in the selected period.
_Avoid_: KPI result (that is a single metric actual)

**Performance scorecard**:
A per-person view of local KPIs and, when connected, CMS Goals, shown as separate sections with separate totals, never one blended number.
_Avoid_: Merged score, combined performance index

**Goal / Target (CMS)**:
A performance target sourced from the CMS Goals integration (not a local KPI definition).
_Avoid_: KPI, KPI target (when meaning the CMS entity)

**Leave request**:
A time-off request in the tenant leave snapshot awaiting or past a decision.
_Avoid_: Time-off ticket, PTO case

**Task**:
Work assigned by an admin to one or more employees, with optional deliverables, due date, and review.
_Avoid_: To-do, ticket (when meaning Elevora HR tasks); canonical task event (integration analytics)

**Shared task assignment**:
One task row with multiple assignees who collaborate and see each other's activity.
_Avoid_: Group chat, project

**Individual task assignment**:
One create action that fans out into separate task copies (one assignee each), linked by a batch id.
_Avoid_: Template library, bulk edit
