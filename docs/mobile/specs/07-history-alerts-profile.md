# 07 — History, alerts, push, profile, team

Prototype: `history`, `alerts`, `sync`, `more`, `team`.

## History

Day strip, totals (worked / OT / break), sessions per day with session bar. Chips: Offline (`source = mobile_offline`), Late in, Time suspect.

## Alerts

Inbox with category filter (All / Shifts / Leave / Tasks). Mark read / mark all read via outbox events. Header bell with unread dot.

## Push + deep links

Register Expo push token at sign-in and on token change.

| Type | Destination |
|---|---|
| `leave.decided` | Leave request detail |
| `task.assigned` / `task.changes_requested` | Task detail |
| `shift.reminder` | Today |
| `overtime.prompt` | Overtime sheet |
| `zone.incident` | Shift detail |
| `announcement` | Alerts |

## Sync center

Queue status, failed events, conflicts (Keep web version / Re-apply mine). Linked from offline banner and Profile.

## Profile (`more`)

- Profile card: on-time %, leave days, KPI score if module on.
- Links: History, Alerts, Team today (managers), Sync center, Offline maps.
- Preferences: language (EN/AR + RTL reload), dark mode, biometrics, location & privacy explainer.
- Sign out: stop tracking; clear local data after outbox empty, or warn if not.

## Team today (managers)

Four stat cards (Clocked / Late / Leave / Missed) + direct reports list + “See on map”. Data from `/v1/mobile/team/presence` (and sync snapshot).
