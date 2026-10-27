# Google Play Console — filled answers

Use with a production/internal AAB from EAS `production`.

## Store listing

| Field | Value |
| --- | --- |
| App name | Polara Field |
| Short description | Clock in, stay on zone, and track field shifts for your team. |
| Full description | See **Full description** below |
| Privacy policy | `https://elevora.xaeons.com/privacy` |
| Category | Business |
| Contact email | `info@xaeons.com` |
| Contact website | `https://elevora.xaeons.com` |

### Full description

```
Polara Field is the mobile companion for Polara workforce management. Employees invited by their employer can clock in and out, take breaks, view shifts, request leave, complete tasks, and work offline with later sync.

Location is used to verify clock-in against a work zone and — for mobile field staff — to record the on-shift route for operations. Location is collected only while you are clocked in. When you allow location all the time, updates may continue while the app is in the background during an active shift; a persistent notification (“On shift · tracking location”) remains visible on Android. Continued use of GPS in the background can dramatically decrease battery life.

Accounts are created by your employer’s admin. Polara Field does not offer public self-signup.
```

---

## Data safety form

Answer **Yes** to collecting data. Declare the following. Do **not** mark data as sold or used for advertising.

### Location

| Type | Collected | Shared | Required / optional | Purpose |
| --- | --- | --- | --- | --- |
| Approximate location | Yes | Yes (with employer tenant admins / managers per role) | Required for field features | App functionality |
| Precise location | Yes | Yes (same) | Required for field features | App functionality |

**Ephemeral?** No — points retained per tenant retention (see privacy policy; default window described in `docs/PRIVACY.md`).

**Processed ephemerally only?** No.

### Photos and videos

| Type | Collected | Shared | Required / optional | Purpose |
| --- | --- | --- | --- | --- |
| Photos | Yes | Yes (employer tenant) | Optional (task / leave attachments) | App functionality |

Camera is used only when the user attaches a deliverable or leave file. Prefer system picker; no broad gallery scrape.

### Device or other IDs

| Type | Collected | Shared | Required / optional | Purpose |
| --- | --- | --- | --- | --- |
| Device or other IDs | Yes | No (used for session / device binding) | Required for signed-in sync | App functionality |

### Personal info

| Type | Collected | Shared | Purpose |
| --- | --- | --- | --- |
| Name | Yes | Yes (employer) | App functionality |
| Email | Yes | Yes (employer) | App functionality |

### Not collected (declare No)

- Financial info, health, messages, contacts, calendar, web browsing, app interactions for ads, advertising ID, political/religious, sexual orientation.

### Security practices

- [x] Data is encrypted in transit (HTTPS/TLS)
- [ ] Users can request deletion — **Yes**: via employer HR / admin (no in-app account creation; document in store text)
- Independent security review: No (unless you have one)

### Data deletion URL (optional field)

```
https://elevora.xaeons.com/privacy
```

---

## Background location declaration

| Question (paraphrased) | Answer |
| --- | --- |
| Does the app access location in the background? | **Yes** |
| Is background location essential to the core purpose? | **Yes** — on-shift field tracking for mobile-presence employees |
| Core feature description | Polara Field verifies attendance and records the employee’s route **only while clocked in** for employer field operations. Background location powers continuous updates when the app is not foregrounded during an active shift. Tracking stops on clock-out or sign-out. |
| Prominent disclosure | In-app screen before the system “Allow all the time” prompt (`/location-disclosure`). Copy states collection while on shift, FGS notification, battery impact, and Continue / Not now. |
| Video | Upload per [VIDEO-SCRIPT.md](./VIDEO-SCRIPT.md) |

**Foreground service type:** `location` (already in app config / manifest via Expo).

---

## Content rating (IARC questionnaire)

Polara Field is a B2B workforce tool. Typical answers:

| Topic | Answer |
| --- | --- |
| Violence / blood / sexual content / language | No |
| Controlled substances / gambling | No |
| User-generated content that is publicly shared | No (employer-tenant only; not a social network) |
| Users can communicate | Limited (tasks/leave within org — not public chat). Prefer **No** for unrestricted UGC / chat unless you enable public messaging. |
| Shares location | Yes — with the user’s employer organization for work |
| Age | Everyone / PEGI 3 equivalent (no objectionable content) |

Complete the interactive questionnaire in Play Console; if a question is ambiguous, choose the more restrictive truthful option.

---

## Permissions declaration notes

Expected sensitive permissions:

- `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` — clock + zone
- `ACCESS_BACKGROUND_LOCATION` — on-shift tracking (mobile presence)
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_LOCATION` — Android FGS while on shift
- `CAMERA` — optional attachments
- `POST_NOTIFICATIONS` — shift / OT / leave / tasks

Do not add `READ_MEDIA_*` / broad storage unless a future build requires it; prefer photo picker.

---

## Internal testing checklist

1. [ ] Create closed/internal testing track
2. [ ] Upload AAB
3. [ ] Add testers (or license testers)
4. [ ] Install from Play internal link on a physical Android device
5. [ ] Run [VIDEO-SCRIPT.md](./VIDEO-SCRIPT.md) once for declaration upload
6. [ ] Promote to production only after Data safety + bg-location approved
