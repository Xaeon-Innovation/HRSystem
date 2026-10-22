# 06 — Shifts, Leave, Tasks

Do **not** invent status sets or leave rules. Use existing Fastify services + `@hr/shared` leave domain. Offline writes go through outbox events in [01-api-surface.md](./01-api-surface.md).

## Shifts

Prototype: `shifts`, `shift`.

- Day strip, today card + session bar, week totals (scheduled / worked / OT).
- Upcoming instances; “Changed” chip when version changed since last viewed.
- Recent flags: late in, left zone, deduction.
- Detail: mini map, window, presence mode, break, OT grace, pattern days, today timeline.

Hooks: `useShifts`, `useShift(id)` reading SQLite.

## Leave

Prototype: `leave`, `leave-new`, `leave-detail`, `approvals`.

- Balances: annual hero + small cards; request list with status chips.
- New request: type chips from tenant leave types (hide unavailable); length full / 1st half / 2nd half / hours (half only if type allows); planned vs emergency; range calendar; live balance math; conflict warning from cached team leave (server re-checks); note; attachment if required.
- Offline: pending “Waiting to send”.
- Detail: timeline; cancel while pending; edit/resubmit when returned.
- Approvals: managers and `leaves` system module role — approve / reject / return with note.

Events: `leave.create`, `leave.cancel`, `leave.resubmit`, `leave.decide`.

## Tasks

Prototype: `tasks`, `task`.

- List segments: open / in progress / submitted / done.
- Cards: priority, status, due, deliverable type, batch progress (individual), avatar stack (shared), tags.
- Detail: description, mini map if location, deliverables (photo/file/link) with upload progress, activity log, Submit for review or Mark complete.
- Changes requested: reviewer note at top.
- Review queue for `tasks` module role: accept or request changes.

Events: `task.status`, `task.comment`, `task.deliverable.*`, `task.review` with `baseVersion` for conflict detection.
