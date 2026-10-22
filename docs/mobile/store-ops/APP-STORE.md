# App Store Connect — filled answers

## App Information

| Field | Value |
| --- | --- |
| Name | Elevora Field |
| Subtitle | Field clock-in for Elevora |
| Category | Business |
| Privacy Policy URL | `https://elevora.xaeons.com/privacy` |
| Support URL | `https://elevora.xaeons.com` |
| Marketing URL | `https://elevora.xaeons.com` |
| Copyright | Xaeon |

## Description (paste)

```
Elevora Field is the mobile app for employees on Elevora. Your employer invites you; there is no public self-signup.

Clock in and out, manage breaks, see today’s shift, request leave, complete tasks, and keep working offline — events sync when you are back online.

Location is used to confirm you are in your work zone at clock-in and, for mobile field roles, to record your route while you are on shift. Location is not collected when you are clocked out. If you allow Always location, Elevora may update your position while the app is in the background during an active shift only.

Continued use of GPS running in the background can dramatically decrease battery life.

Questions about your data: ask your HR admin or privacy@xaeons.com.
```

## Keywords (100 char max)

```
hr,attendance,clock,field,workforce,shift,leave,tasks,gps,offline
```

## What’s New (1.0.0)

```
First public release of Elevora Field: clock-in, on-shift location for field staff, shifts, leave, tasks, and offline sync.
```

---

## App Privacy (nutrition labels)

**Privacy Policy URL:** `https://elevora.xaeons.com/privacy`

**Tracking:** No — do not enable App Tracking Transparency; we do not track across apps/websites for ads.

### Data used to track you

None.

### Data linked to the user

| Data type | Collected | Linked to identity | Used for tracking | Purposes |
| --- | --- | --- | --- | --- |
| Precise Location | Yes | Yes | No | App Functionality |
| Coarse Location | Yes (derived / approximate) | Yes | No | App Functionality |
| Name | Yes | Yes | No | App Functionality |
| Email Address | Yes | Yes | No | App Functionality |
| Photos or Videos | Yes (user-attached) | Yes | No | App Functionality |
| Device ID | Yes (device / session binding) | Yes | No | App Functionality |
| Product Interaction | Optional / minimal (crash diagnostics when Sentry DSN set) | Yes if enabled | No | App Functionality / Analytics (diagnostics only) |

If Sentry is **not** wired in the build, omit Product Interaction / crash data until the DSN ships.

### Data not collected

Contact Info beyond name/email, Health, Financial, Sensitive Info, Contacts, Browsing History, Advertising Data, etc.

---

## App Review Information

### Sign-in required

Yes.

### Demo account

| Field | Value |
| --- | --- |
| User name | `employee@acme.local` |
| Password | `Employee123!` |
| Notes | Workspace slug **acme** must be entered on the first screen before sign-in. |

### Contact

| Field | Value |
| --- | --- |
| First name | (your ops contact) |
| Last name | (your ops contact) |
| Phone | (reachable during review) |
| Email | `info@xaeons.com` |

### Notes (paste entire block)

```
Elevora Field is a workforce app for employees invited by their employer.

ACCOUNT CREATION / DELETION
• The app does not support self-service account creation.
• Employers create accounts in the Elevora web admin.
• Account or personal-data deletion is requested via the employer’s HR/admin (see Profile → Location & privacy, and https://elevora.xaeons.com/privacy).

DEMO LOGIN
1. Open the app → enter workspace slug: acme
2. Sign in: employee@acme.local / Employee123!
3. If shown Unlock, tap Unlock (session continue — no Face ID).
4. Onboarding → Continue on permissions → read the Location disclosure → Continue → grant When In Use, then Always.
5. Today → Clock in.
6. Confirm on-shift tracking (iOS blue status bar / location indicator while in use; background updates while Always is granted and the employee remains clocked in).
7. Optional: Profile → Location & privacy.

BACKGROUND LOCATION
• Used only for mobile-presence field staff while clocked in.
• In-app prominent disclosure is shown before the Always permission.
• Tracking stops on clock-out or sign-out.
• Purpose string and listing note battery impact.

Please use a device with Location Services enabled. Simulated location inside the UAE Dubai Marina area is fine if GPS is unavailable in the review environment.
```

---

## Encryption export compliance

`ITSAppUsesNonExemptEncryption` is set to `false` in `app.config.ts` (standard HTTPS only). Confirm the same answer in App Store Connect export compliance.

---

## Info.plist sensitive strings (sanity)

Expected:

- `NSLocationWhenInUseUsageDescription`
- `NSLocationAlwaysAndWhenInUseUsageDescription` (includes battery sentence)
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `UIBackgroundModes`: location, fetch, remote-notification

Must **not** be present until biometrics ship:

- `NSFaceIDUsageDescription`

---

## TestFlight

1. [ ] Upload build via `eas submit --platform ios`
2. [ ] Add internal testers; smoke clock-in + Always location
3. [ ] Submit for external TestFlight review if needed, then App Review
