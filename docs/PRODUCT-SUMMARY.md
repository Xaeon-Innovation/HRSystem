# Elevora product summary

Elevora is a multi-tenant HR and field workforce platform (a Xaeon product). Each **tenant** has its own roster, settings, and subscription. People on that roster are **employees**. Admins can grant an employee a **system module role** (`kpis`, `leaves`, `hiring`, `compensation`, `tasks`) so they can run that module without becoming a full tenant admin.

Modules are gated by the tenant plan, with optional platform overrides. Marketing **packs** group those modules:

| Pack | Modules |
| --- | --- |
| Field ops | Live map, Team today |
| People ops | Leave, Hiring, KPIs, Compensation, Tasks |
| Analytics | Analytics |
| Integrations | Integrations |

Default plan codes: trial, field, people, ops, scale, enterprise, starter, pro. Field plans include field ops. People plans include people ops. Analytics is on trial, ops, scale, enterprise, and pro. Integrations are on scale, enterprise, and pro.

The app UI is in English and Arabic. Tenant branding covers display name, logo, and color preset. Clock events queue offline and sync when the device is back online.

---

## Who sees what

| Role | Home | Navigation |
| --- | --- | --- |
| Platform super admin (no tenant entered) | Platform overview | Tenants, subscriptions, leads, plans, features, payments, audits, health, profile |
| Tenant admin, or super admin inside a tenant | Operations dashboard | Operate, People, Perform, System — modules appear only when the plan includes them |
| Employee | Clock | Own history, alerts, profile, plus entitled modules. Team today only if they manage a team. Hiring, compensation, and full KPI admin only with the matching system module role |

---

## Public site

| Page | Path | What it does |
| --- | --- | --- |
| Home | `/` | Marketing landing: hero, module strip (clock-in, live map, KPIs, leave, hiring, compensation), how it works, product bento, who it is for, and a free-trial call to action |
| Pricing | `/pricing` | Plan comparison with a seat slider |
| Sign up | `/signup` | Create a tenant and start a trial |
| Log in | `/login` | Email and password sign-in |
| Book a demo | `/demo` | Public demo request (name, company, email, phone, message) that becomes a platform lead |
| Privacy | `/privacy` | Privacy policy |
| Terms | `/terms` | Terms of use |

Single sign-on (Google / Microsoft) is documented as planned and is not a login option yet.

---

## Tenant workspace

### Dashboard — `/app`

Operations home for a tenant admin.

- Setup checklist: brand the workspace, branches and sites, job roles, skills catalog, add employees, presence and work zones, shift patterns, review leave policies, alert rules.
- Live presence: people clocked in now, and people visible on the live map.
- Exceptions: unread alerts (missed clock-outs, anomalies, announcements).
- Goals and leave: count of active KPI definitions, and the pending leave queue.

### Clock — `/app/clock`

One-tap clock in and clock out. The server records the timestamp.

- Shows today’s shift window and flags (late clock-in, late clock-out, day marked for deduction).
- Break start and end. While on break, leaving the work zone is allowed until the break ends.
- Overtime prompt at the end of the shift (stay vs clock out), with a grace period.
- Fixed-zone employees must be inside their geofence. Mobile employees (for example drivers) can clock in from anywhere.
- Offline queue shows how many events are waiting to sync.
- Link through to attendance history.

### Attendance — `/app/attendance`

Day view of who worked. A day strip moves between dates. Each person card lists sessions. Admins can correct a session (note and clock-out time). Admins also get a link to the hours report. Employees see this as **History**.

### Hours report — `/app/attendance/hours`

Admin report for a date range (defaults to the current month). Rows are per employee per day: shift hours, overtime hours, and total work hours, plus a total line. Export to CSV.

### Team today — `/app/team`

Field-ops module. Who is clocked in, clocked out, or on leave today, including late and missed clock-out. Managers see their direct reports; admins see the tenant.

### Live map — `/app/map`

Field-ops module for tenant admins.

- **Live**: realtime positions (WebSocket, with REST polling if the socket is down). Markers distinguish on-shift vs last seen.
- **History**: saved locations by employee and time, drawn as a trail.
- Filters by person. Draw or edit a work zone (center, radius) for fixed-zone employees. Mobile employees have no zone.
- Map appearance saved for the organization: theme presets, map style, marker style, initials on markers, and colors for on-shift, last-seen, and history trails.

### Alerts — `/app/notifications`

Inbox of notifications with filters (category, urgency, unread only), mark read, and mark all read.

Admins also get:

- **Event alerts**: toggle built-in rules by category.
- **Custom**: build, edit, and delete custom alert rules.
- Announcements to the tenant.

### Employees — `/app/employees`

Roster for tenant admins.

- Search by name, email, or phone.
- Add one person or import CSV (template download, paste or upload, review incomplete rows before commit). Export CSV.
- Fields include title, job roles, branch, manager, access (employee or admin), system module roles, status, and presence mode (fixed work zone vs mobile).
- Edit profile, sign-in credentials, and temporary passwords shown once after create.
- Per-person HR file: documents (passport, residency, driving license, contract, other), skills, training, and assessments.
- Jump to that person’s analytics.

### Org setup — `/app/settings/org`

Job roles and branches and sites used by the roster. Also reachable from Employees and from Settings.

### Shifts — `/app/shifts`

- View upcoming shift instances (window, late in, late out, deduction flags) and active patterns.
- Set a pattern per employee: daily, weekly (weekdays), or monthly (days of month), with start and end times. Deactivate a pattern.
- Break policy: duration in minutes, and whether the window is fixed or the employee chooses.
- Left-zone incidents: approve as emergency, or mark a day deduction.

### Leave — `/app/leave`

People-ops module. Sub-pages:

| Section | Path | What it does |
| --- | --- | --- |
| Requests | `/app/leave` | Submit and review leave. Statuses: draft, pending, approved, rejected, cancelled, returned, expired. Full day, first half, second half, or custom hours. Planned or emergency. Conflict warnings. Detail drawer for a decision |
| Balances | `/app/leave/balances` | Remaining balances and the ledger (accrual, carry-over, manual adjustment, deduction, cancellation credit, expiry, policy reset, pending reserve and release) |
| Calendar | `/app/leave/calendar` | Who is out, by day |
| Policies | `/app/leave/policies` | Admin only. Leave types and policies, plus notification settings |
| Reports | `/app/leave/reports` | Summaries of usage and decisions |

Default leave types: annual, sick, emergency, unpaid, compensatory, maternity, paternity, and work from home. Each type can track a balance, require approval, require an attachment, count as paid, allow half days, and allow emergency requests.

### Hiring — `/app/hiring`

People-ops module. Admins with the hiring role run the full desk. Hiring managers and assigned interviewers see the jobs and candidates they are on.

Tabs:

- **Dashboard**: openings, interviews today, pending offers, urgent alerts (stuck stages or hire dates).
- **Job openings**: create and edit jobs, hiring manager, recruiter owner.
- **Pipeline**: board across stages — sourced, resume reviewed, phone screen, assessment, interview round 1, interview round 2, final interview, offer extended, offer accepted, hired, rejected.
- **Candidates**: source (careers page, referral, LinkedIn, job board, recruiter upload, walk-in, agency, internal transfer), status (active, on hold, hired, rejected, withdrawn, talent pool), resume parsing.
- **Interviews**: calendar and scorecards.
- **Offers**: create and track offers.
- **Hired**: convert an accepted hire onto the employee roster.
- **Best fit**: ranked drafts against open jobs.
- **Reports**: funnel and hiring summaries.

### Tasks — `/app/tasks`

People-ops module.

- Admins create tasks; employees see work assigned to them.
- Priority: low, medium, high, urgent. Status: open, in progress, submitted, changes requested, completed, cancelled.
- Optional due date, tags, and review.
- **Shared** assignment: one task, several assignees, shared activity.
- **Individual** assignment: one create action fans out into separate copies linked by a batch. Batches show a completion count.
- Search, status filter, and batch filter.
- Deliverables (report, docs, screenshots, other) as a link or a file, plus an activity log.

### KPIs — `/app/kpis`

People-ops module. A **KPI** is a tenant-defined metric with a target and a recorded result. The **overall performance score** is the weighted roll-up of complete results for the selected period. It is never blended with CMS Goals.

Views:

- **People** (or **Me** for an employee without the KPI admin role): per-person scorecard. Local KPIs and, when connected, CMS Goals stay in separate sections with separate totals.
- **Metrics**: definitions and results, with filters. Employees acknowledge new results.
- **Insights**: charts by category, benchmarks against the overall score. Admins can pull attendance actuals (fill attendance-like scores from this month’s clock-ins).
- **Reports**: performance report export.

Admins define metrics, targets, and templates. Employees with only self access see **My KPIs**.

### Compensation — `/app/compensation`

People-ops module, for admins with the compensation role (and employees granted that role).

Tabs:

- **Overview**: pending approvals and recent changes.
- **Employees**: pay profiles, filters, and a profile drawer.
- **History**: compensation change log and audit timeline.
- **Allowances**: recurring pay components.
- **Approvals**: approve, reject, or return a change, with a note.
- **Bonus / commission**: variable pay.
- **Payroll inputs**: period rows and manual adjustments.
- **Reports**: compensation summaries. Payslip preview from a profile.

### Analytics — `/app/analytics`

Workforce activity for a date window, including data synced from integrations.

- Snapshot: attendance rate, active employees, jobs completed, visits completed, productivity, revenue linked.
- Drill a metric into a per-person breakdown.
- Trend (last 7 days or the full range): attendance, jobs, visits, revenue.
- By branch: open a branch page.
- Link to performance (KPIs) and to analytics alerts.

Related pages:

| Page | Path | What it does |
| --- | --- | --- |
| My analytics | `/app/analytics/me` | Sends the signed-in employee to their own analytics page |
| Employee | `/app/analytics/employees/[id]` | Daily series: clocked in, work minutes, lateness, jobs, visits, tasks, revenue, productivity, anomaly score, GPS updates vs expected, plus a timeline of events |
| Branch | `/app/analytics/branches/[id]` | The same snapshot sliced to one branch |
| Analytics alerts | `/app/analytics/alerts` | Integration and workforce alerts. Acknowledge or resolve |

### Integrations — `/app/integrations`

Tenant-admin module.

Live connections:

- **CMS Goals**: service-account sign-in. Synced goals appear on the performance scorecard and in analytics as Goals, separate from local KPIs.
- **HubSpot CRM**: OAuth. Deals become sales events for analytics.
- **Custom**: REST API, webhook, or CSV. Provider labels also cover CRM and ERP routed through custom REST. Sync modes: polling, webhook, manual, or hybrid.

Coming-soon catalog entries are shown but cannot be connected yet.

Each connection (`/app/integrations/[id]`) has setup progress: base URL, endpoints, authentication, field mappings, test fetch, then sync. Actions: sync now, replay dead letters, pause, activate. Unmatched identity links are listed so people in the external system can be tied to employees.

### Settings — `/app/settings`

- Org setup (job roles, branches, sites).
- Branding sheet: display name, logo, color preset.
- Pointer to live-map appearance (edited on the map page, saved for the tenant).

### Billing — `/app/billing`

Current plan, seat count, renewal or period end. Change seats, subscribe to another plan, open the billing portal, or cancel at period end. Checkout status updates after the payment provider confirms. Seat changes and cancellation use in-app confirmation.

### Health — `/app/health`

Aggregated operational metrics: missed clock-outs, sync failures, notification issues, plus a recent event list.

### Profile — `/app/profile`

Signed-in user: name, role, avatar upload with crop (or remove), and language (English or Arabic).

---

## Platform admin

These pages are for a super admin who has not entered a tenant workspace. Entering a tenant switches the shell to that tenant’s admin navigation. A lab workspace can unlock every module or preview a plan without using a customer tenant.

| Page | Path | What it does |
| --- | --- | --- |
| Overview | `/app` | Estimated MRR, tenants by status, subscriptions by status, lead funnel (new leads, demos in 7 and 30 days, active paid tenants, open trials), recent leads, recent payment events |
| Tenants | `/app/tenants` | Search and filter, provision a tenant (org, slug, admin, optional plan), open that workspace, suspend, activate, or soft-delete |
| Tenant detail | `/app/tenants/[id]` | Plan, seats, period end, integrations, assign a plan, linked leads, recent payments, recent audits |
| Subscriptions | `/app/subscriptions` | Cross-tenant subscription list and status |
| Leads | `/app/leads` | Demo and signup leads. Statuses: new, contacted, qualified, converted, closed |
| Plans | `/app/plans` | Plan catalog: name, interval, price, seat limits, and which modules each plan turns on |
| Features | `/app/features` | Module launch status (draft, lab, or general availability) and the plan matrix. Enter the lab with everything unlocked, or preview a specific plan |
| Payments | `/app/payments` | Payment events from Polar and Paymob |
| Audits | `/app/audits` | Platform audit log |
| Health | `/app/health` | Same health metrics view, at platform scope when not inside a tenant |
| Profile | `/app/profile` | Platform admin profile and language |

---

## How access fits together

1. The tenant’s plan (plus any platform override) decides which modules appear in navigation.
2. Inside an enabled module, system module roles decide whether an employee can administer it or only see their own slice (for example My KPIs, own leave, own tasks, My analytics).
3. Hiring is narrower still: a hiring manager or assigned interviewer sees only their jobs, candidates, and scorecards.
4. Clock, attendance history, alerts, and profile are available without a pack. Hours report, employees, shifts, settings, billing, and health are tenant-admin tools.
