<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# design the feature architecture so i can give it to cursor as a reference so he can build it

Yes, and the right way to frame it for Cursor is as an **Integrations + Analytics Platform inside the HR system**, not a one-off CMS connector. The architecture should treat your HR app as the operational system of record for workforce activity, while external systems feed business context into an analytics layer through a controlled integration backbone. Since you're already comfortable with Next.js, TypeScript, Node-style backend patterns, and PostgreSQL/Drizzle, this design fits well into your existing stack and should be practical for Cursor to implement.[^1][^2][^3]

## Product definition

**Feature name:** Integrations Hub + Admin Analytics

**Goal:** Let each tenant connect its CMS/ERP/CRM/project system to the HR platform, normalize external business events, and expose dashboards that correlate workforce behavior with business outcomes. The architecture should separate transactional HR operations from analytical reporting, which is the recommended pattern for reliable people/workforce analytics systems.[^1][^2][^4][^5]

### Core outcomes

- Connect tenant systems through API keys, webhooks, polling jobs, CSV import, or manual adapters.[^2][^6]
- Normalize external records into a canonical event model tied to `tenant_id`, `employee_id`, `branch_id`, `site_id`, and `source_system`.[^4][^2]
- Show admin dashboards for attendance, field operations, KPI performance, and business-linked productivity metrics.[^7][^4]
- Maintain source-of-truth rules, audit trails, sync logs, and reconciliation health checks.[^8][^3]


## High-level modules

Build the feature as 6 modules.

### 1. Integration catalog

A tenant-visible list of supported connectors:

- Custom REST API
- Webhook endpoint
- CSV upload
- CRM connector
- ERP/operations connector
- CMS/project/task connector

Each connector has:

- metadata
- auth config
- sync strategy
- field mapping
- status
- last sync
- error state


### 2. Integration runtime

A service layer that:

- receives webhooks in real time[^2]
- polls external APIs on schedules[^6]
- validates payloads
- stores raw payloads
- transforms records into canonical models
- writes sync logs and dead-letter failures[^8]


### 3. Canonical business data layer

This is the heart of the system. Do not query analytics directly from raw connector payloads. Use normalized tables/views instead.[^1][^4]

Canonical entities:

- employee identity link
- branch/site link
- customer/account
- project/job/task
- visit/service event
- sales/revenue event
- operational KPI event
- attendance/location correlation event


### 4. Analytics engine

A set of materialized views / summary tables updated on schedule or incrementally:

- attendance summaries
- branch productivity summaries
- employee productivity summaries
- route efficiency summaries
- labor-cost-vs-output summaries
- anomaly detections
- leaderboard and trend snapshots


### 5. Admin dashboards

Three dashboard levels are best practice:

- Executive summary
- Operational detail
- Team/employee drill-down[^9][^4]


### 6. Governance and observability

Must include:

- field-level source-of-truth definitions[^3][^1]
- audit logging[^3][^8]
- sync health monitoring[^8]
- reconciliation reports
- RBAC and privacy boundaries[^5]


## Architecture principles

Use these exact rules in the build:

1. **HR system is source of truth for workforce identity.** Employee master data, org structure, roles, attendance, and location originate in the HR system unless explicitly overridden.[^2][^3]
2. **External systems are sources of operational/business context.** Example: jobs completed, tickets closed, leads processed, service visits, revenue events.[^10][^3]
3. **One stable join key everywhere:** `employee_id`. Never use department names or free-text employee names as the join key.[^4][^2]
4. **No point-to-point chaos.** All integrations go through one integration layer, not directly into feature modules.[^2][^8]
5. **Analytics runs from canonical tables/views, not raw integration payloads**.[^1][^4]
6. **Separate operational dashboards from strategic dashboards** so real-time admin views do not get bloated with historical BI logic.[^5]

## Suggested repo architecture

This fits your stack cleanly.

```txt
apps/
  web/
    app/
      (dashboard)/
        integrations/
        analytics/
        analytics/[dashboardId]/
        employees/[employeeId]/analytics/
      api/
        integrations/
        webhooks/
        analytics/
packages/
  db/
    schema/
    queries/
    analytics/
  integrations/
    connectors/
      custom-rest/
      custom-webhook/
      csv-import/
      crm/
      cms/
      erp/
    mappers/
    runtime/
    validators/
  analytics/
    metrics/
    materializers/
    anomaly/
    filters/
```

If you're staying full-stack Next.js, the "runtime" can initially live in route handlers, background jobs, and internal services. If you later need workers, extract `packages/integrations` and `packages/analytics` into separate worker processes.

## Data model

Use multi-tenant scoping on **every** table with `tenant_id`.

### Core integration tables

```ts
integration_connections
- id
- tenant_id
- name
- provider_type              // custom_api | webhook | csv | crm | cms | erp
- status                     // draft | active | paused | error
- auth_type                  // api_key | bearer | oauth2 | basic | none
- auth_config_encrypted_json
- base_url
- webhook_secret_encrypted
- sync_mode                  // webhook | polling | manual | hybrid
- poll_interval_minutes
- created_by
- created_at
- updated_at
```

```ts
integration_field_mappings
- id
- tenant_id
- connection_id
- source_entity              // task, visit, lead, sale, ticket, employee_ref
- source_field
- target_entity              // canonical_job_event, canonical_visit_event, etc.
- target_field
- transform_type             // direct | enum_map | date_parse | number_parse | custom
- transform_config_json
- is_required
- created_at
```

```ts
integration_sync_runs
- id
- tenant_id
- connection_id
- trigger_type               // schedule | webhook | manual | replay
- status                     // running | success | partial | failed
- started_at
- ended_at
- records_received
- records_processed
- records_failed
- error_summary
- cursor_json                // pagination checkpoint / delta sync pointer
```

```ts
integration_raw_events
- id
- tenant_id
- connection_id
- sync_run_id
- source_event_type
- external_record_id
- payload_json
- received_at
- processed_at
- processing_status          // pending | processed | failed | dead_letter
- error_details
```


### Identity mapping tables

```ts
external_employee_links
- id
- tenant_id
- connection_id
- external_employee_key
- employee_id
- match_confidence
- match_method               // direct_id | email | phone | manual
- is_active
- created_at
```

```ts
external_branch_links
- id
- tenant_id
- connection_id
- external_branch_key
- branch_id
- site_id
- created_at
```


### Canonical business event tables

```ts
canonical_job_events
- id
- tenant_id
- source_connection_id
- external_record_id
- employee_id
- branch_id
- site_id
- customer_id
- project_id
- event_type                // created | assigned | started | completed | cancelled
- status
- title
- category
- occurred_at
- scheduled_at
- completed_at
- duration_minutes
- value_amount
- currency
- metadata_json
```

```ts
canonical_visit_events
- id
- tenant_id
- source_connection_id
- external_record_id
- employee_id
- branch_id
- site_id
- customer_id
- check_in_at
- check_out_at
- visit_duration_minutes
- visit_status
- revenue_amount
- metadata_json
```

```ts
canonical_task_events
- id
- tenant_id
- source_connection_id
- external_record_id
- employee_id
- assigned_at
- completed_at
- due_at
- task_type
- priority
- status
- points
- metadata_json
```

```ts
canonical_sales_events
- id
- tenant_id
- source_connection_id
- external_record_id
- employee_id
- branch_id
- customer_id
- event_date
- amount
- currency
- status
- metadata_json
```


### Derived analytics tables

```ts
employee_daily_analytics
- id
- tenant_id
- employee_id
- day
- branch_id
- was_clocked_in
- total_work_minutes
- overtime_minutes
- lateness_minutes
- gps_updates_count
- off_route_flags
- jobs_completed_count
- visits_completed_count
- tasks_completed_count
- revenue_generated
- labor_cost_estimate
- productivity_score
- anomaly_score
- generated_at
```

```ts
branch_daily_analytics
- id
- tenant_id
- branch_id
- day
- active_employees
- attendance_rate
- lateness_rate
- missed_clock_outs
- jobs_completed_count
- visits_completed_count
- revenue_generated
- labor_cost_estimate
- productivity_index
- generated_at
```

```ts
analytics_alerts
- id
- tenant_id
- alert_type                // attendance_drop | off_route | low_productivity | sync_failure
- severity                  // low | medium | high
- entity_type               // employee | branch | connection | tenant
- entity_id
- alert_date
- title
- description
- payload_json
- status                    // open | acknowledged | resolved
```


## Domain relationships

Use this mental model:

- HR attendance/location data = internal operational signals.
- External CMS/CRM/ERP data = business outcome signals.
- Analytics = correlated layer across both.

Examples:

- `attendance_records` + `canonical_visit_events` → "time on shift vs visits completed"
- `location_pings` + `canonical_job_events` → "route efficiency and idle time"
- `kpi_scores` + `canonical_sales_events` → "performance score vs revenue output"
- `employees` + `task_events` + `lateness` → "low productivity risk"

That correlation pattern is exactly what makes unified workforce analytics valuable.[^4][^3][^5]

## Integration patterns

Support 4 ingestion patterns from day one.

### A. Webhook ingestion

Best for near-real-time operational systems.[^2]

- External client posts event to `/api/webhooks/integrations/[connectionId]`
- Verify signature
- Store raw payload
- Queue transform job
- Upsert canonical event
- Refresh lightweight real-time analytics widgets


### B. Polling sync

Best for systems with REST APIs but no webhooks.[^6]

- Scheduled job per connection
- Use cursor/timestamp checkpoint
- Pull pages incrementally
- Upsert events idempotently by `external_record_id`


### C. CSV import

Best for MVP and legacy systems.

- Admin uploads CSV
- Field mapping wizard
- Preview parsed rows
- Confirm import
- Save mapping template
- Optionally re-use recurring import


### D. Manual API connector

For customer-specific systems:

- Admin enters base URL + API key
- Chooses entity types to sync
- Maps fields manually
- Runs test fetch
- Saves connection


## API design

### Integration setup APIs

```http
POST   /api/integrations/connections
GET    /api/integrations/connections
GET    /api/integrations/connections/:id
PATCH  /api/integrations/connections/:id
POST   /api/integrations/connections/:id/test
POST   /api/integrations/connections/:id/sync
GET    /api/integrations/connections/:id/sync-runs
POST   /api/integrations/connections/:id/mappings
GET    /api/integrations/connections/:id/mappings
```


### Webhook ingestion APIs

```http
POST /api/webhooks/integrations/:connectionId
```


### Analytics APIs

```http
GET /api/analytics/summary
GET /api/analytics/attendance
GET /api/analytics/productivity
GET /api/analytics/field-ops
GET /api/analytics/business-output
GET /api/analytics/branches/:branchId
GET /api/analytics/employees/:employeeId
GET /api/analytics/alerts
```


### Drill-down APIs

```http
GET /api/analytics/drilldown?metric=visits_completed&groupBy=employee&from=...&to=...
GET /api/analytics/timeline?employeeId=...&date=...
GET /api/analytics/correlation?x=work_minutes&y=jobs_completed&period=30d
```


## Admin UI architecture

Build 5 pages.

### 1. Integrations list

Cards/table showing:

- provider
- status
- sync mode
- last sync
- records synced
- errors
- actions: test, sync now, edit, pause


### 2. Integration detail

Tabs:

- Overview
- Authentication
- Mapping
- Sync history
- Raw events
- Error logs


### 3. Mapping builder

A UI that maps source fields to canonical fields.
Needs:

- source sample payload/rows
- target schema list
- transform selector
- validation preview
- unmatched fields warnings


### 4. Analytics dashboard

Layout should follow dashboard best practice:

- Top row: 3-5 strategic KPIs only[^7][^4]
- Second row: trends
- Third row: distribution and drill-downs
- Side filters: date, branch, department, site, employee, source system

Suggested widgets:

- attendance rate
- active field employees now
- jobs/visits completed today
- productivity index
- labor cost vs output
- sync health
- open alerts


### 5. Employee analytics profile

For one employee:

- attendance summary
- location summary
- visit/job/task output
- KPI trend
- anomaly flags
- timeline combining attendance + external job events


## Metric architecture

Define every metric explicitly before building, or reporting will drift.[^5][^4]

### Recommended MVP metrics

- Attendance rate
- Lateness rate
- Missed clock-out rate
- Total work hours
- GPS coverage completeness
- Jobs completed
- Visits completed
- Task completion rate
- Revenue per employee
- Labor cost per completed visit/job
- Productivity score
- Branch productivity index


### Example formulas

```txt
attendance_rate = present_employees / scheduled_employees

task_completion_rate = completed_tasks / assigned_tasks

gps_coverage_completeness = gps_updates_received / gps_updates_expected

revenue_per_employee = total_revenue / active_employees

labor_cost_per_job = labor_cost_estimate / jobs_completed

productivity_score =
  weighted(
    attendance_quality,
    punctuality,
    jobs_completed,
    visits_completed,
    task_completion_rate,
    kpi_score
  )
```


### Important metric rule

Store:

- raw facts
- computed measures
- metric version

So when formulas change later, you can recalculate historically without corrupting old dashboards.

## Suggested scoring engine

Use a configurable rule engine, not hardcoded scores.

```ts
analytics_metric_definitions
- id
- tenant_id
- key
- name
- description
- formula_type           // sql | expression | weighted_score
- formula_config_json
- aggregation_level      // employee | branch | tenant
- time_grain             // day | week | month
- version
- is_active
```

```ts
analytics_metric_results
- id
- tenant_id
- metric_definition_id
- entity_type
- entity_id
- date_bucket
- value_numeric
- value_json
- version
- generated_at
```

This makes the product extensible and premium.

## Processing flow

Use this end-to-end pipeline.

1. Tenant creates connection.
2. Tenant authenticates connector.
3. Tenant maps source fields to canonical fields.
4. Runtime receives or fetches data.
5. Save raw payload in `integration_raw_events`.
6. Transform into canonical events.
7. Resolve employee/branch/site links.
8. Upsert canonical tables idempotently.
9. Trigger analytics materialization.
10. Update dashboards and alerts.
11. Log sync status and reconciliation outcomes.

## Background jobs

You will need scheduled/background tasks even if you keep one app process for now.

Jobs:

- connector polling
- dead-letter replay
- analytics materialization
- nightly reconciliation
- stale sync detection
- anomaly detection
- alert generation
- retention cleanup for raw payloads

Suggested cadence:

- Webhook: immediate
- Polling sync: every 5-30 minutes depending on tenant
- Operational summaries: every 5-15 minutes
- Strategic summaries: nightly
- Reconciliation: nightly

This follows the recommended split between event-driven, batch, and analytics flows.[^6][^2]

## Analytics storage pattern

Use a **three-layer model**:

### Layer 1: transactional

Your existing HR tables:

- employees
- attendance
- location_pings
- KPI records


### Layer 2: operational integration

- raw events
- canonical business events
- sync runs
- identity links


### Layer 3: analytical

- daily summary tables
- metric results
- alerts
- materialized views

This three-layer model is specifically recommended to prevent reporting failures and dashboard confusion.[^1]

## Security and multi-tenancy

Since this is multi-tenant and could expose sensitive business data, enforce:

- `tenant_id` on every integration and analytics table
- encrypted secrets at rest
- signed webhook verification
- field-level RBAC for analytics screens[^5]
- audit log for create/update/delete on connections and mappings[^3][^8]
- PII minimization in raw payload storage
- retention policy for raw payloads, e.g. 30-90 days
- masked values in UI logs for tokens and secrets


### Roles

- Super Admin: platform-level visibility into connection health only, not tenant business payloads
- Tenant Admin: manage connectors, mappings, analytics dashboards
- HR Manager: view workforce analytics, not connector secrets
- Analyst/Manager: view filtered dashboards only


## Suggested MVP scope

For a fast first version, build only:

### MVP

- Custom REST connector
- Webhook connector
- CSV import
- Field mapping UI
- Canonical events for tasks, visits, sales
- Employee/branch linking
- Executive dashboard
- Branch dashboard
- Employee analytics page
- Sync logs + alerts


### Later

- OAuth connectors
- No-code formula builder
- Predictive attrition/risk scoring[^5]
- Dashboard builder
- Cross-tenant benchmarks
- AI narrative insights


## Cursor-ready implementation brief

You can paste this part directly:

```md
Build an "Integrations Hub + Admin Analytics" module inside the multi-tenant HR system.

Tech stack:
- Next.js App Router + TypeScript
- PostgreSQL
- Drizzle ORM
- Server actions / route handlers
- Background jobs for sync + analytics
- Multi-tenant scoping with tenant_id on every table

Architecture rules:
1. HR system is source of truth for employees, org structure, attendance, location, and KPI data.
2. External customer systems (CMS/ERP/CRM/project systems) provide operational/business events only.
3. All integrations go through one integration layer. No direct point-to-point feature integrations.
4. Store raw integration payloads, then transform into canonical business event tables.
5. Build analytics from canonical tables and summary/materialized tables, never directly from raw payloads.
6. Use employee_id as the only stable identity join key. Never use names/departments as join keys.
7. Add full sync logging, audit logging, reconciliation, and alerting.

Modules:
- integrations list
- integration setup/test page
- field mapping builder
- sync history + raw event inspector
- analytics dashboards
- employee analytics profile
- alerts center

Canonical entities:
- canonical_job_events
- canonical_visit_events
- canonical_task_events
- canonical_sales_events
- external_employee_links
- external_branch_links
- employee_daily_analytics
- branch_daily_analytics
- analytics_alerts

Required ingestion methods:
- webhook
- polling
- CSV import
- manual REST connector

Required dashboards:
- executive summary
- branch operations
- employee analytics

Required analytics:
- attendance rate
- lateness rate
- missed clock-outs
- GPS coverage completeness
- jobs completed
- visits completed
- task completion rate
- revenue per employee
- labor cost per output
- productivity score
- anomaly alerts

Implementation requirements:
- idempotent upserts by external_record_id
- encrypted auth secrets
- tenant RBAC
- audit logs
- nightly reconciliation jobs
- summary refresh jobs
- dead-letter replay support
```


## Build order

Best implementation order:

1. schema + tables
2. integration connections CRUD
3. webhook ingestion
4. raw event storage
5. field mapping engine
6. canonical event upserts
7. employee/branch link resolution
8. summary tables
9. dashboard APIs
10. dashboard UI
11. polling + CSV import
12. alerts + reconciliation

That order minimizes rework and follows the recommended practice of establishing authoritative sources, integration paths, and canonical views before dashboarding.[^4][^3]

## Product advice

Yes, this is a very strong feature, especially for enterprise or agency clients. It turns your HR tool from “attendance + GPS tracker” into a **workforce intelligence platform**, which is a much stronger positioning and upsell path. The key is to implement it as a layered architecture with source-of-truth rules, canonical data models, and focused admin dashboards rather than a loose “CMS integration” page.[^11][^12][^13][^1][^4][^2]

I can also turn this into a **PRD + database schema + API spec document** formatted specifically for Cursor next.
<span style="display:none">[^14][^15][^16][^17][^18]</span>

<div align="center">⁂</div>

[^1]: https://www.hr-transformation.net/hris-data-architecture-the-three-layer-model-that-prevents-downstream-reporting-failures

[^2]: https://pawanjoshi.com.np/playbook/people-ops-integration-architecture

[^3]: https://www.agile-hr-analytics.com/guide-integrating-hris-payroll-business-data-unified-hr-dashboards/

[^4]: https://mihcm.com/resources/blog/hr-analytics-dashboard-best-practices-and-examples/

[^5]: https://nationalhumanresourcesauthority.com/hr-metrics-and-workforce-analytics

[^6]: https://www.agile-hr-analytics.com/hr-analytics-implementation-checklist-from-data-to-decisions/

[^7]: https://mihcm.com/resources/blog/real-time-hr-dashboards-the-ultimate-guide/

[^8]: https://www.agile-hr-analytics.com/hris-agile-hr-analytics-integration-patterns/

[^9]: https://www.fanruan.com/en/blog/how-to-build-a-people-analytics-dashboard-template

[^10]: https://ijrpr.com/uploads/V6ISSUE9/IJRPR52808.pdf

[^11]: https://www.basedash.com/blog/best-bi-tools-for-hr-and-people-analytics-teams-compared-2026

[^12]: https://www.mokahr.io/articles/en/the-best-workforce-analytics-software

[^13]: https://www.leapsome.com/blog/8-best-workforce-analytics-software-platforms-for-2026

[^14]: https://smc.sgoi.org.in/wp-content/uploads/2026/06/HR-Analytics-and-HRIS-MBPC3001-3RD-Sem.pdf

[^15]: https://assets.ctfassets.net/lbgy40h4xfb7/6izwHVX8UwwG2dS3fwtyfs/63c30d8a65782213f6123a06259bc762/HR_Tech_Guide_Building_People_Analytics_for_HRIS_and_HR_Ops.pdf

[^16]: https://irjiet.com/article_file/IRJIET6100301751441851.pdf

[^17]: https://www.onemodel.co/blog/people-analytics-data-integrations

[^18]: https://deepwiki.com/jeezy05/PowerBI-projects/3.3.1-dashboard-components

