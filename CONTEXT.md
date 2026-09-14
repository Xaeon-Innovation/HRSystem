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

**Live presence**:
Whether someone is clocked in and/or visible on the live map right now.
_Avoid_: Online status, check-in (ambiguous with leave)

**KPI**:
A tenant-defined performance metric with a target and recorded result for a person.
_Avoid_: Goal (CMS targets are Goals/Targets from the Creative Intelligent CMS)

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
A performance target sourced from the Creative Intelligent CMS integration (not a local KPI definition).
_Avoid_: KPI, KPI target (when meaning the CMS entity)

**Leave request**:
A time-off request in the tenant leave snapshot awaiting or past a decision.
_Avoid_: Time-off ticket, PTO case
