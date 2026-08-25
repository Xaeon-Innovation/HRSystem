# CMS Goal Integration Guide (HR Platform)

This document describes how an HR platform can authenticate to the CMS, fetch employee **goal** data, and run analysis on it.

In the CMS, goals are stored as **Targets**. There is no separate Goal/OKR entity. Use the target APIs below.

| | |
|---|---|
| **Base URL** | `https://api.creativeintelligent.ae/api/v1` |
| **Auth** | JWT Bearer (no API key or OAuth client) |
| **Content type** | `application/json` |
| **Timezone note** | Progress windows use UTC. Other CMS reports use Dubai (UTC+4). See [Caveats](#11-caveats). |

---

## 1. Connection and authentication

There is no dedicated integration key. The HR platform must log in as a CMS employee and send the access token on every request.

**Recommended:** a dedicated service account with an `admin` or `team_leader` role (read access to all employees and targets). Do not reuse a personal staff login.

### 1.1 Login

`POST /auth/login`

```json
{
  "phone": "+9715XXXXXXXX",
  "password": "<service-account-password>"
}
```

Success `200`:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "3f2a1c8e-....",
      "name": "HR Integration",
      "role": "admin",
      "roles": ["admin"],
      "phone": "+9715XXXXXXXX"
    },
    "accessToken": "<jwt>",
    "refreshToken": "<jwt>",
    "expiresIn": "24h"
  }
}
```

Send the access token on subsequent calls:

```
Authorization: Bearer <accessToken>
```

Access tokens expire in **24 hours** by default. Refresh tokens expire in **7 days**.

### 1.2 Refresh

`POST /auth/refresh-token`

```json
{
  "refreshToken": "<jwt>"
}
```

Success `200`:

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "<new-jwt>",
    "refreshToken": "<new-refresh-jwt>",
    "expiresIn": "24h"
  }
}
```

If refresh fails with `401`, log in again.

---

## 2. Recommended fetch flow

```
1. POST /auth/login                         → accessToken
2. GET  /employee?isActive=true             → identity map (UUID + staff code)
3. GET  /target-management?isActive=true    → per-goal rows + live progress
4. GET  /target/analysis                    → daily / weekly / monthly KPIs
5. (optional) GET /target-management/:id/progress
6. (optional) GET /employee/:id/performance
```

- Use **`/target-management`** for individual goal records the HR system stores or displays.
- Use **`/target/analysis`** for rolled-up attainment (the payload designed for analysis).
- Match people with **UUID** on target APIs. Match HR employee numbers with the **staff code** (`employeeId`). See [Identity matching](#3-identity-matching).

---

## 3. Identity matching

Employees have two identifiers:

| CMS field | Example | Use for |
|-----------|---------|---------|
| Internal UUID | `3f2a1c8e-9b12-4d55-a111-88c0e0f1a2b3` | All target, analysis, and team APIs (`assignedToId`, `employeeId` query) |
| Staff code `employeeId` | `Creative@015` | Matching the HR employee number / payroll ID |

**Preferred identity call:** `GET /employee?isActive=true`

This list remaps fields for the UI. Use them as follows:

| Response field | Meaning |
|----------------|---------|
| `uuid` | Internal UUID — **pass this** to `/target-management` and `/target/analysis` |
| `id` | Staff code (same as `employeeId`) |
| `employeeId` | Staff code |
| `name` | Display name |
| `roles` | Active roles, e.g. `["sales"]` |

`GET /employee/active` returns UUID in `id` and does **not** include the staff code. Prefer `GET /employee?isActive=true` when you need to join to HR records.

`GET /employee/:id/performance` accepts **either** UUID or staff code.

---

## 4. Endpoints (read path)

All routes below are relative to `https://api.creativeintelligent.ae/api/v1` and require `Authorization: Bearer <token>` unless noted.

### 4.1 Goals (primary)

#### List goals

`GET /target-management`

| Query | Type | Description |
|-------|------|-------------|
| `type` | string | `daily` \| `weekly` \| `monthly` |
| `category` | string | See [categories](#62-goal-category--hr-metric) |
| `employeeId` | string | Employee **UUID** (not staff code) |
| `isActive` | `true` \| `false` | Filter active / inactive |

Response includes a live `currentValue` (recalculated from source data) and the last 7 `progress` snapshots.

```json
{
  "success": true,
  "targets": [
    {
      "id": "a1b2c3d4-....",
      "assignedToId": "3f2a1c8e-....",
      "assignedById": "9aa1....",
      "type": "monthly",
      "category": "new_patients",
      "description": "Acquire 20 new patients this month",
      "targetValue": 20,
      "currentValue": 12,
      "startDate": "2026-08-01T00:00:00.000Z",
      "endDate": "2026-08-31T23:59:59.000Z",
      "completedAt": null,
      "isActive": true,
      "teamId": null,
      "createdAt": "2026-08-01T08:00:00.000Z",
      "updatedAt": "2026-08-22T12:00:00.000Z",
      "assignedTo": { "id": "3f2a1c8e-....", "name": "Sara Ali", "role": "sales" },
      "assignedBy": { "id": "9aa1....", "name": "Admin" },
      "progress": [
        { "id": "...", "targetId": "a1b2c3d4-....", "date": "2026-08-22T00:00:00.000Z", "progress": 12, "notes": null }
      ]
    }
  ]
}
```

#### Goals for one employee

`GET /target-management/employee/{employeeId}`

- Path `employeeId` is the employee **UUID**.
- Query: `type`, `category` (optional).
- Returns `{ success, targets }` (active goals only).

#### Goal statistics

`GET /target-management/stats?employeeId={uuid}`

```json
{
  "success": true,
  "stats": {
    "totalTargets": 8,
    "activeTargets": 5,
    "completedTargets": 2,
    "overdueTargets": 1,
    "totalProgress": 47,
    "averageProgress": 58.75
  }
}
```

`averageProgress` is `(sum of currentValue / sum of targetValue) * 100`.

#### Progress history (time series)

`GET /target-management/{targetId}/progress?days=30`

```json
{
  "success": true,
  "progress": [
    {
      "id": "...",
      "targetId": "a1b2c3d4-....",
      "date": "2026-08-22T00:00:00.000Z",
      "progress": 12,
      "notes": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ]
}
```

`days` defaults to `30`.

#### Recalculate one goal (optional)

`POST /target-management/{targetId}/calculate`

Forces a fresh count from commissions / visits and returns `{ success, message, progress }` where `progress` is the new integer actual.

---

### 4.2 Analysis (primary KPI payload)

`GET /target/analysis`

| Query | Type | Description |
|-------|------|-------------|
| `employeeId` | string | Employee **UUID**. Omit to return all eligible staff. |
| `startDate` | ISO date | Filters which **target records** are included (by `createdAt`) |
| `endDate` | ISO date | Same |

**Scope:** active employees whose active roles include `sales` or `coordinator` only.

```json
{
  "success": true,
  "data": [
    {
      "employeeId": "3f2a1c8e-....",
      "employeeName": "Sara Ali",
      "role": "sales",
      "dailyTarget": {
        "goal": 5,
        "current": 2,
        "percentage": 40,
        "status": "in_progress"
      },
      "weeklyTarget": {
        "goal": 20,
        "current": 20,
        "percentage": 100,
        "status": "completed"
      },
      "monthlyTarget": {
        "goal": 80,
        "current": 0,
        "percentage": 0,
        "status": "not_started"
      },
      "overallPerformance": {
        "totalCommissions": 142,
        "totalTargets": 105,
        "completionRate": 46.67
      }
    }
  ]
}
```

Period fields:

| Field | Meaning |
|-------|---------|
| `goal` | Sum of `targetValue` for active targets of that type |
| `current` | Sum of live progress for those targets |
| `percentage` | `min((current / goal) * 100, 100)`, rounded to 2 decimals |
| `status` | `completed` if percentage ≥ 100; `in_progress` if current > 0; else `not_started` |

`overallPerformance.completionRate` is the average of the three period percentages. `totalTargets` is `daily.goal + weekly.goal + monthly.goal`. `totalCommissions` is the employee's all-time commission count (not limited to the query dates).

---

### 4.3 Employees (identity and supporting metrics)

#### List for mapping (recommended)

`GET /employee?isActive=true`

Optional query: `role` (`sales`, `coordinator`, …).

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "uuid": "3f2a1c8e-....",
      "id": "Creative@015",
      "employeeId": "Creative@015",
      "name": "Sara Ali",
      "phone": "+9715XXXXXXXX",
      "role": "sales",
      "roles": ["sales"],
      "isActive": true,
      "accountStatus": "active"
    }
  ]
}
```

#### Simple active list (UUID only)

`GET /employee/active` → `{ success, data, message }` where `data[].id` is the UUID (no staff code).

#### Employee performance (optional richer analysis)

`GET /employee/{id}/performance?startDate=2026-08-01&endDate=2026-08-31`

`{id}` accepts UUID **or** staff code. Date range uses Dubai timezone.

Returns employee profile, commission breakdown, revenue (AED), appointments, visits (coordinators), and new-patient visits (sales). Pagination query params: `transactionsPage`, `transactionsLimit`, `appointmentsPage`, `appointmentsLimit`, `visitsPage`, `visitsLimit`, `newPatientVisitsPage`, `newPatientVisitsLimit`.

#### Commission breakdown (optional)

`GET /commission/breakdown?employeeId={uuid}&startDate=2026-08-01&endDate=2026-08-31`

Per-employee commission counts by type, plus visit/appointment/revenue aggregates for the same window.

---

### 4.4 Teams (optional)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/team` | List teams |
| `GET` | `/team/{id}` | Team detail |
| `GET` | `/team/{id}/progress` | Team goal progress |
| `GET` | `/team/{id}/members-progress` | Per-member progress for the team goal |
| `GET` | `/team/analysis` | Admin-only team analysis |

Team goals also appear on `/target-management` when `teamId` is set.

---

### 4.5 Reference lists

| Method | Path | Returns |
|--------|------|---------|
| `GET` | `/target-management/types` | Period types (`daily`, `weekly`, `monthly`) |
| `GET` | `/target-management/categories` | Goal categories |
| `GET` | `/target-management/employees` | `{ id, name }` of active employees (UUID) |
| `GET` | `/target-management/bootstrap` | types + categories + employees in one call |

---

## 5. Field mapping (CMS → generic HR Goal)

Use these as the mapping table for the HR vendor. Column **HR field** is a generic name; rename to the vendor's schema if they provide one.

### 5.1 Employee

| CMS field | Source | HR field | Notes |
|-----------|--------|----------|-------|
| `uuid` (from `GET /employee`) | Employee | `externalEmployeeId` / internal ID | Required join key for goal APIs |
| `employeeId` / list `id` | Employee | `employeeNumber` | Human staff code, e.g. `Creative@015` |
| `name` | Employee | `displayName` | |
| `roles[]` | EmployeeRole | `jobRole` / `jobFamily` | `sales`, `coordinator`, `team_leader`, … |
| `phone` | Employee | `workPhone` | Login identifier in CMS |
| `isActive` + `accountStatus` | Employee | `employmentStatus` | Both must be active to appear in analysis |

### 5.2 Goal record (`GET /target-management`)

| CMS field | HR field | Notes |
|-----------|----------|-------|
| `id` | `goalId` | UUID |
| `description` | `goalName` / `title` | Free text |
| `category` | `goalType` / `kpiCode` | See [5.4](#54-category--kpi-metric) |
| `type` | `period` / `cadence` | `daily` \| `weekly` \| `monthly` |
| `targetValue` | `targetValue` / `quota` | Integer |
| `currentValue` | `actualValue` / `achieved` | Live integer |
| `currentValue / targetValue * 100` | `completionPercent` | Cap at 100 if you want parity with analysis |
| `startDate` | `periodStart` | UTC ISO-8601 |
| `endDate` | `periodEnd` | UTC ISO-8601 |
| `isActive` | `isActive` | |
| `completedAt` | `completedAt` | Null until `currentValue >= targetValue` |
| Derived status | `status` | `completed` if `completedAt` set; `overdue` if active, not completed, and now > `endDate`; else `active` / `inactive` |
| `assignedToId` | `ownerEmployeeId` | UUID |
| `assignedTo.name` | `ownerName` | |
| `assignedById` | `setByEmployeeId` | Who created the goal |
| `teamId` | `orgUnitId` / `teamId` | Null for individual goals |
| `progress[]` | `progressHistory` | Time series for trend charts |
| `progress[].date` | `asOfDate` | |
| `progress[].progress` | `actualAsOfDate` | |
| `progress[].notes` | `comment` | Optional |

### 5.3 Analysis record (`GET /target/analysis`)

| CMS field | HR field | Notes |
|-----------|----------|-------|
| `employeeId` | `externalEmployeeId` | UUID |
| `employeeName` | `displayName` | |
| `role` | `jobRole` | Comma-separated if multiple |
| `dailyTarget.goal` | `dailyQuota` | |
| `dailyTarget.current` | `dailyActual` | |
| `dailyTarget.percentage` | `dailyAttainmentPct` | Already capped at 100 |
| `dailyTarget.status` | `dailyStatus` | `not_started` \| `in_progress` \| `completed` |
| `weeklyTarget.*` | `weeklyQuota` / `weeklyActual` / … | Same shape |
| `monthlyTarget.*` | `monthlyQuota` / `monthlyActual` / … | Same shape |
| `overallPerformance.completionRate` | `overallScore` | Average of the three period percentages |
| `overallPerformance.totalTargets` | `totalQuota` | Sum of the three period goals |
| `overallPerformance.totalCommissions` | `activityCount` | All-time commissions, not period-scoped |

### 5.4 Category → KPI metric

| CMS `category` | Suggested HR metric name | How actual is counted |
|----------------|--------------------------|------------------------|
| `new_patients` | New patient acquisitions | **Sales:** actual new-patient visits in the goal window. **Others:** count of `PATIENT_CREATION` commissions |
| `follow_up_patients` | Follow-up completions | Count of `FOLLOW_UP` commissions in the window |
| `specialties` | Specialties added | Count of `VISIT_SPECIALITY_ADDITION` commissions |
| `nominations` | Nomination conversions | Count of `NOMINATION_CONVERSION` commissions |
| `custom` | Custom / manual | Stored `currentValue` only (not auto-counted) |

### 5.5 Period type

| CMS `type` | Reset / window | HR period |
|------------|----------------|-----------|
| `daily` | Calendar day | Daily goal |
| `weekly` | Week (Monday start in CMS UI copy) | Weekly goal |
| `monthly` | Calendar month | Monthly goal |

Each target still has explicit `startDate` / `endDate`. Prefer those over inferring dates from `type`.

---

## 6. Enums and derived values

### 6.1 Goal period (`type`)

`daily` | `weekly` | `monthly`

### 6.2 Goal category

`new_patients` | `follow_up_patients` | `specialties` | `nominations` | `custom`

### 6.3 Analysis status

| Value | Rule |
|-------|------|
| `not_started` | `current == 0` |
| `in_progress` | `current > 0` and percentage < 100 |
| `completed` | percentage ≥ 100 |

### 6.4 Suggested HR status from a goal row

| Condition | Status |
|-----------|--------|
| `completedAt` is set | `completed` |
| `isActive` and now > `endDate` and not completed | `overdue` |
| `isActive` and not completed | `active` |
| `isActive == false` | `inactive` |

### 6.5 Employee roles (typical owners of goals)

`sales` | `coordinator` | `team_leader` | `admin` | `finance` | `data_entry` | `driver` | `observer` | `super_admin`

Analysis only includes `sales` and `coordinator`.

---

## 7. Sample curl

Replace tokens and IDs.

```bash
BASE=https://api.creativeintelligent.ae/api/v1

# 1. Login
curl -sS -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+9715XXXXXXXX","password":"********"}'

# 2. Identity map
curl -sS "$BASE/employee?isActive=true" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 3. All active goals
curl -sS "$BASE/target-management?isActive=true" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 4. Goals for one employee (UUID)
curl -sS "$BASE/target-management/employee/3f2a1c8e-9b12-4d55-a111-88c0e0f1a2b3" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 5. Analysis (all sales + coordinators)
curl -sS "$BASE/target/analysis" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 6. Analysis for one employee and a created-at window
curl -sS "$BASE/target/analysis?employeeId=3f2a1c8e-9b12-4d55-a111-88c0e0f1a2b3&startDate=2026-08-01&endDate=2026-08-31" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 7. Progress history
curl -sS "$BASE/target-management/a1b2c3d4-1111-2222-3333-444444444444/progress?days=30" \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 8. Refresh
curl -sS -X POST "$BASE/auth/refresh-token" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"'"$REFRESH_TOKEN"'"}'
```

Typical error shapes:

```json
{ "success": false, "message": "Access token required" }
```

```json
{ "success": false, "message": "Invalid or expired token" }
```

HTTP `401` → re-authenticate. HTTP `403` → the service account lacks permission.

---

## 8. How progress is calculated

For each goal, actual (`currentValue`) is counted between that goal's `startDate` (00:00:00 UTC) and `endDate` (23:59:59 UTC):

1. **`new_patients`** — if the assignee has role `sales`, count actual new-patient visits; otherwise count `PATIENT_CREATION` commissions.
2. **`follow_up_patients`** — count `FOLLOW_UP` commissions for the assignee.
3. **`specialties`** — count `VISIT_SPECIALITY_ADDITION` commissions.
4. **`nominations`** — count `NOMINATION_CONVERSION` commissions.
5. **`custom`** — use the stored `currentValue` (manual).

`GET /target-management` recalculates these on read and persists `currentValue` (and sets `completedAt` when actual ≥ target).

Analysis sums those live actuals by period type (`daily` / `weekly` / `monthly`) per employee.

---

## 9. Permissions

| Capability | Typical roles |
|------------|----------------|
| Read targets / progress | `admin`, `team_leader`, `sales`, `coordinator`, `data_entry` |
| Targets UI / manage all staff | `admin`, `team_leader` |
| Team analysis | `admin` |

A service account should be `admin` or `team_leader` so HR can pull every employee's goals, not only the caller's own.

---

## 10. Out of scope (write APIs)

The HR pull integration should **not** call these unless the vendor is also writing goals back into the CMS:

- `POST /target-management` — create goal
- `PUT /target-management/{targetId}` — update goal
- `PUT /target-management/{targetId}/progress` — manual progress
- `DELETE /target-management/{targetId}`
- `POST /target-management/reset` — inactivate expired goals
- `PUT /team/{id}/target` — set team goal (admin)

Legacy `GET/POST/PUT/DELETE /target` exists but does **not** recalculate live progress. Prefer `/target-management`.

---

## 11. Caveats

1. **No API key / OAuth.** Protect the service account phone + password. Rotate the password if it is shared.
2. **Token lifetime.** Refresh before `expiresIn` (`24h`). Refresh tokens last 7 days.
3. **Analysis population.** `/target/analysis` only includes active `sales` and `coordinator` employees. Other roles with goals still appear on `/target-management`.
4. **Date filters on analysis** apply to target **`createdAt`**, not to the measurement window. Measurement always uses each target's `startDate` / `endDate`.
5. **UUID vs staff code.** Passing a staff code such as `Creative@015` as `employeeId` on `/target-management` will return no rows. Use `uuid` from `GET /employee`.
6. **`GET /employee/active` omits staff code.** Use `GET /employee?isActive=true` for HR matching.
7. **Percentage cap.** Analysis percentages are capped at 100. Raw `currentValue` on a goal row can exceed `targetValue`.
8. **`totalCommissions` on analysis is all-time**, not limited to `startDate`/`endDate`.
9. **Do not use `GET /target`** for integration; it returns stored values without live recalculation.
10. Login is rate-limited (100 attempts / 5 minutes in production).

---

## 12. Minimal mapping checklist for the vendor

1. Authenticate with `POST /auth/login`; send `Authorization: Bearer`.
2. Load employees from `GET /employee?isActive=true`.
3. Map HR employee number → CMS `employeeId` (staff code) → CMS `uuid`.
4. Pull goals from `GET /target-management?isActive=true` (or per `employeeId` UUID).
5. Pull KPIs from `GET /target/analysis`.
6. Map CMS fields using [section 5](#5-field-mapping-cms--generic-hr-goal).
7. Refresh tokens with `POST /auth/refresh-token`.
