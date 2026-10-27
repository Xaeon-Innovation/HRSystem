# Play background-location declaration video

**Target length:** 35–55 seconds  
**Device:** Physical Android phone (not emulator) with a **production or internal** build that includes `ACCESS_BACKGROUND_LOCATION`  
**Resolution:** 720p+ landscape or portrait; clear UI text  
**Audio:** Optional narration; on-screen steps are enough if text is readable  

## Pre-roll setup (do not film)

1. Fresh install or clear app data so onboarding / disclosure appears.
2. API reachable (staging or production). Seeded `acme` employee with `presenceMode = mobile` (see [REVIEWER-DEMO.md](./REVIEWER-DEMO.md)).
3. Location permission reset: Settings → Apps → Polara Field → Permissions → Location → Don’t allow (so prompts appear on camera).
4. Enable “Show taps” in Developer options (optional, helps reviewers).

## Shot list (record continuously)

| Time | Action | Must be visible |
| ---: | --- | --- |
| 0:00 | Launch Polara Field | App icon / splash |
| 0:05 | Workspace `acme` → Continue | Slug field |
| 0:10 | Sign in `employee@acme.local` / `Employee123!` | Sign-in screen |
| 0:18 | Permissions → **Continue** | Onboarding permissions |
| 0:22 | **Location disclosure** screen — pause 2s so bullets are readable | Title + “all the time” / on-shift / notification / battery |
| 0:28 | Tap **Continue** on disclosure | Accept CTA |
| 0:30 | System **While using the app** → Allow | System dialog |
| 0:34 | System **Allow all the time** → Allow | System dialog (Android 10+) |
| 0:38 | Today → **Clock in** (complete clock-check) | Clock-in success / Tracking chip |
| 0:45 | Pull down notifications / show status bar | **“On shift · tracking location”** FGS notification |
| 0:50 | Press Home / switch away; wait 2s with notification still present | App not in foreground + FGS still showing |
| 0:55 | End | — |

## If Always was already granted

Before recording: revoke location → Don’t allow, force-stop app, relaunch so disclosure + dialogs appear again.

## Upload

- Play Console → App content → Sensitive permissions → Background location → upload MP4/YouTube unlisted per Console instructions.
- Same video can be linked in the declaration form notes if a URL field exists.

## Apple (optional companion clip)

Not required as a file upload, but keep a 20s internal clip of iOS Always + blue location indicator after clock-in for App Review replies if asked.
