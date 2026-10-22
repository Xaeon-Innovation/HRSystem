# Elevora redesign plan for Cursor

The goal is to restyle the whole Elevora app (public site, tenant workspace, employee view, platform admin) to match the reference: a soft neutral canvas, white rounded cards, black primary buttons, and lime hatched data bars. It needs light mode, dark mode, and Arabic RTL.

This is a visual refactor only. Do not change routes, data fetching, server actions, API contracts, permissions, plan gating, or business logic. Every page keeps its current behavior. Only markup structure, classes, and presentational components change.

Use the attached prototype (`elevora-redesign-prototype/`) as the visual source of truth. Every screen in this plan exists there. Open `index.html`, then use "All pages" to see each one.

---

## 0. How to use this plan in Cursor

1. Put this file and the prototype folder at the repo root under `/design/`.
2. Run the phases in order. Each phase ends with a Cursor prompt you can paste into Composer or Agent mode.
3. After each phase, run the app in light and dark, English and Arabic, at 1440px and 390px. Compare against the prototype before moving on.
4. Commit after each phase: `git commit -m "redesign: phase N"`.

Global rule to paste at the top of every Cursor session:

> You are restyling Elevora. Follow /design/ELEVORA-REDESIGN-PLAN.md and match /design/elevora-redesign-prototype. Do not change data fetching, server actions, route structure, permission checks, or plan gating. Only presentational code changes. Use the design tokens and the shared components from `components/ui` and `components/elevora`. Never hardcode hex colors in pages. Use logical CSS properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) so RTL works.

---

## 1. Design language (what "looks like the reference" means)

| Element | Rule |
|---|---|
| Canvas | Outer page `--canvas` (#EDEDEB light / #08090A dark). App sits in one rounded frame (`--frame`, 24px radius, 10px inset from the viewport). |
| Sidebar | Same color as the frame, no hard divider. Groups have small uppercase labels. Active item is a white raised pill with a 3px dark bar on the start edge. Collapsible sub-items sit under a thin vertical line. Upgrade card at the bottom, then "Collapse sidebar". |
| Top bar | Search field (white, 40px, ⌘K hint) on the start side. On the end side: theme toggle, language toggle, bell with a dot, settings, user chip (avatar, name, email, role switcher), black primary button. |
| Cards | White `--surface`, 18px radius, 1px `--line` border, almost no shadow. 20px padding. Title 15px/600, subtitle 11.5px muted. Top-right holds pill selects ("7d ⌄"), icon toggles, or a small outline button. |
| Numbers | Big figures 30–34px/600, tight tracking, tabular numbers. Under them, a delta line: trend icon, green or orange value, then muted context ("from last month"). |
| Data fills | Diagonal hatched stripes on every bar, progress track, and segment. The accent is lime. Secondary colors are yellow and orange. Idle bars are light grey and hatched too. The active bar is colored and the others go idle. |
| Charts | Stacked hatched bar chart with a floating white tooltip. Segmented semicircle gauge. Segmented horizontal mix bar with a legend list. Thin area line for trends. |
| Lists | Icon tile or avatar, then title and subtitle, then a right-aligned value and status text. Rows are split by 1px lines, like the reference "Transaction history". |
| Buttons | Primary is solid ink (black in light, off-white in dark). Secondary is a white outline. Accent (lime) is only for the single most important action in a view, such as "Start trial" or "Acknowledge". |
| Tabs | A segmented white bar with a grey active pill. No underline tabs. |
| Drawers | Right-side floating panel with 24px radius, inset 10px, blurred scrim. Header, scrollable body, and sticky footer with actions. |
| Type | General Sans (Fontshare) for Latin, IBM Plex Sans Arabic for Arabic. Sans only. Remove the current serif from the app UI. |

---

## 2. Phase 1: Tokens, fonts, theme, RTL foundation

### 2.1 Fonts (`app/layout.tsx`)

```tsx
// Latin: General Sans via Fontshare CSS (no next/font package for it)
// Arabic: IBM Plex Sans Arabic via next/font/google
import { IBM_Plex_Sans_Arabic } from "next/font/google";
const plexArabic = IBM_Plex_Sans_Arabic({ subsets: ["arabic"], weight: ["400","500","600","700"], variable: "--font-ar" });

// in <head>:
<link rel="preconnect" href="https://api.fontshare.com" />
<link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap" rel="stylesheet" />

// <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={plexArabic.variable} suppressHydrationWarning>
```

You can also self-host General Sans in `/public/fonts` with `next/font/local`. That is the better choice for production.

### 2.2 Tokens (`app/globals.css`)

Replace the current color variables with this set. The names map onto shadcn's expected variables, so existing shadcn components pick them up automatically.

```css
@layer base {
  :root {
    --font-sans: "General Sans", "Inter", system-ui, sans-serif;

    /* Elevora surfaces */
    --canvas: 60 5% 92.5%;        /* #EDEDEB */
    --frame: 60 9% 96.5%;         /* #F6F6F4 */
    --surface: 0 0% 100%;         /* cards */
    --surface-2: 60 6% 95.5%;     /* #F5F5F3 subtle fill */
    --surface-3: 60 5% 92%;       /* #EDEDEA active pill */
    --line: 60 5% 92%;            /* #ECECE9 */
    --line-strong: 60 4% 86%;     /* #DEDEDA */
    --text: 0 0% 7%;              /* #121212 */
    --text-2: 60 2% 28%;          /* #4A4A47 */
    --muted-fg: 60 2% 55%;        /* #8E8E89 */
    --bar-idle: 60 5% 91.5%;
    --bar-idle-stripe: 60 6% 95.5%;

    /* Brand accent (tenant color preset overrides these) */
    --accent: 80 61% 50%;         /* #9ACD32 lime */
    --accent-strong: 84 69% 42%;  /* #7DB321 */
    --accent-soft: 82 67% 73%;    /* #C9E98A */
    --accent-tint: 84 62% 92%;    /* #EEF7DC */
    --accent-ink: 82 100% 7%;     /* text on accent */

    --warn: 28 88% 65%;           /* #F4A259 orange */
    --yellow: 57 85% 60%;         /* #EFE444 */
    --danger: 358 75% 59%;        /* #E5484D */
    --info: 216 100% 62%;         /* #3E8BFF */

    /* shadcn mapping */
    --background: var(--frame);
    --foreground: var(--text);
    --card: var(--surface);
    --card-foreground: var(--text);
    --popover: var(--surface);
    --popover-foreground: var(--text);
    --primary: var(--text);              /* ink buttons */
    --primary-foreground: 0 0% 100%;
    --secondary: var(--surface-2);
    --secondary-foreground: var(--text);
    --muted: var(--surface-2);
    --muted-foreground: var(--muted-fg);
    --border: var(--line);
    --input: var(--line-strong);
    --ring: var(--accent);
    --destructive: var(--danger);
    --destructive-foreground: 0 0% 100%;
    --radius: 14px;

    --shadow-sm: 0 1px 2px rgb(17 17 17 / .04), 0 1px 1px rgb(17 17 17 / .03);
    --shadow-md: 0 6px 20px -6px rgb(17 17 17 / .10), 0 2px 6px rgb(17 17 17 / .04);
    --shadow-pop: 0 18px 50px -12px rgb(17 17 17 / .22);
  }

  .dark {
    --canvas: 210 9% 3.5%;        /* #08090A */
    --frame: 210 6% 6.3%;         /* #0F1011 */
    --surface: 220 6% 9.6%;       /* #17181A */
    --surface-2: 210 6% 12.2%;    /* #1D1F21 */
    --surface-3: 216 6% 15.5%;    /* #25272A */
    --line: 216 7% 14.7%;         /* #232528 */
    --line-strong: 214 7% 19.8%;  /* #2F3236 */
    --text: 60 6% 95%;            /* #F3F3F1 */
    --text-2: 60 3% 75%;
    --muted-fg: 60 2% 51%;
    --bar-idle: 216 6% 14.5%;
    --bar-idle-stripe: 210 6% 11.5%;
    --primary: var(--text);
    --primary-foreground: 0 0% 7%;
    --shadow-sm: 0 1px 0 rgb(255 255 255 / .02);
    --shadow-md: 0 8px 24px -8px rgb(0 0 0 / .6);
    --shadow-pop: 0 24px 60px -12px rgb(0 0 0 / .7);
  }

  /* Tenant color presets (Branding → color preset) */
  [data-accent="teal"]    { --accent: 192 70% 46%; --accent-strong: 192 76% 37%; --accent-soft: 192 63% 77%; --accent-tint: 194 62% 93%; --accent-ink: 192 84% 10%; } /* Elevora #23A7C7 */
  [data-accent="emerald"] { --accent: 160 84% 39%; --accent-strong: 161 87% 31%; --accent-soft: 158 60% 73%; --accent-tint: 155 57% 92%; --accent-ink: 160 91% 9%; }
  [data-accent="violet"]  { --accent: 248 88% 73%; --accent-strong: 248 74% 63%; --accent-soft: 249 87% 88%; --accent-tint: 250 89% 96%; --accent-ink: 251 64% 16%; }

  html[dir="rtl"] body { font-family: var(--font-ar), var(--font-sans); }
  body { background: hsl(var(--canvas)); color: hsl(var(--text)); font-family: var(--font-sans); font-size: 13.5px; -webkit-font-smoothing: antialiased; }
  .tabular { font-variant-numeric: tabular-nums lining-nums; }
}

/* Signature hatched fills */
@layer components {
  .hatch        { background-color: hsl(var(--accent));  background-image: repeating-linear-gradient(135deg, rgb(255 255 255 / .28) 0 4px, transparent 4px 9px); }
  .hatch-soft   { background-color: hsl(var(--accent-soft)); background-image: repeating-linear-gradient(135deg, rgb(255 255 255 / .35) 0 4px, transparent 4px 9px); }
  .hatch-warn   { background-color: hsl(var(--warn));    background-image: repeating-linear-gradient(135deg, rgb(255 255 255 / .28) 0 4px, transparent 4px 9px); }
  .hatch-yellow { background-color: hsl(var(--yellow));  background-image: repeating-linear-gradient(135deg, rgb(255 255 255 / .35) 0 4px, transparent 4px 9px); }
  .hatch-danger { background-color: hsl(var(--danger));  background-image: repeating-linear-gradient(135deg, rgb(255 255 255 / .25) 0 4px, transparent 4px 9px); }
  .hatch-idle   { background-color: hsl(var(--bar-idle)); background-image: repeating-linear-gradient(135deg, hsl(var(--bar-idle-stripe)) 0 4px, transparent 4px 9px); }
}
```

If the repo uses Tailwind v4, put the same variables in `@theme inline { --color-surface: hsl(var(--surface)); ... }` instead of `tailwind.config`.

### 2.3 Tailwind config (`tailwind.config.ts`, v3)

```ts
theme: {
  extend: {
    fontFamily: { sans: ["var(--font-sans)"], ar: ["var(--font-ar)"] },
    colors: {
      canvas: "hsl(var(--canvas))", frame: "hsl(var(--frame))",
      surface: { DEFAULT: "hsl(var(--surface))", 2: "hsl(var(--surface-2))", 3: "hsl(var(--surface-3))" },
      line: { DEFAULT: "hsl(var(--line))", strong: "hsl(var(--line-strong))" },
      ink: { DEFAULT: "hsl(var(--text))", 2: "hsl(var(--text-2))", muted: "hsl(var(--muted-fg))" },
      accent: { DEFAULT: "hsl(var(--accent))", strong: "hsl(var(--accent-strong))", soft: "hsl(var(--accent-soft))", tint: "hsl(var(--accent-tint))", ink: "hsl(var(--accent-ink))" },
      warn: "hsl(var(--warn))", yellow: "hsl(var(--yellow))", danger: "hsl(var(--danger))", info: "hsl(var(--info))",
      // keep shadcn keys: background, foreground, card, primary, ... (already mapped)
    },
    borderRadius: { xs: "6px", sm: "10px", md: "14px", lg: "18px", xl: "24px" },
    boxShadow: { sm: "var(--shadow-sm)", md: "var(--shadow-md)", pop: "var(--shadow-pop)" },
    fontSize: { "2xs": ["11px","1.4"], xs: ["12px","1.45"], sm: ["13.5px","1.45"], base: ["15px","1.5"], stat: ["30px","1.05"], "stat-lg": ["34px","1"] },
  },
},
darkMode: ["class"],
```

### 2.4 Theme, accent and direction providers

- Use `next-themes` with `attribute="class"` and `defaultTheme="system"`.
- `AccentProvider` reads the tenant's branding color preset and sets `data-accent` on `<html>`. Use lime as the default and leave the attribute off. Elevora's teal (#23A7C7) is available as the `teal` preset for tenants who want the old brand color.
- Direction comes from the user's language setting (Profile → Language). Set `dir` and `lang` on `<html>` on the server so the first paint is already mirrored.

### 2.5 RTL rules (apply everywhere)

- Replace `ml-/mr-/pl-/pr-/left-/right-/text-left/text-right` with `ms-/me-/ps-/pe-/start-/end-/text-start/text-end`.
- Directional icons (chevron-right, arrow-right, chevrons-left) get `rtl:-scale-x-100`.
- Charts, progress tracks, and time scales stay LTR (`dir="ltr"` on the chart container). Labels around them still mirror.
- Drawers slide in from the end side: `translate-x-full rtl:-translate-x-full`.

Cursor prompt, phase 1:

> Implement Phase 1 of /design/ELEVORA-REDESIGN-PLAN.md. Add General Sans and IBM Plex Sans Arabic, replace the color variables in globals.css with the token set in section 2.2, extend tailwind.config as in 2.3, add the hatch utilities, and wire next-themes, AccentProvider (from tenant branding color preset), and server-side dir/lang. Remove the serif font from the app UI. Remove the old dark-blue radial background. Do not touch any page logic. Show me the diff of every file you change.

---

## 3. Phase 2: Shared component library

Create `components/elevora/` for the new presentational building blocks, and restyle the existing `components/ui` (shadcn) components to the tokens. Pages should only compose these.

| Component | File | Spec |
|---|---|---|
| `AppFrame` | `app-frame.tsx` | Grid: `248px 1fr`, `h-dvh p-2.5`. Sidebar and main share one rounded frame (24px corners on the outside only). Below 1080px, the sidebar becomes an off-canvas sheet and a menu button appears in the top bar. |
| `Sidebar`, `NavGroup`, `NavItem`, `NavSub` | `sidebar.tsx` | Item: 36px tall, 10px radius, 18px icon at 1.75 stroke, 13.5px/500 text. Active: `bg-surface shadow-md font-semibold`, plus a `before:` bar 3px wide at `-start-3.5`. Count badge: an ink circle. Sub-list: `ms-5 border-s` with 12.5px muted links. Upsell card at the bottom. |
| `Topbar` | `topbar.tsx` | 40px controls. `SearchField` (⌘K opens a command palette), `ThemeToggle` (sun/moon segmented), `LangToggle` (ع / EN), `IconButton` (bell with an orange dot), `UserChip` (avatar, name, email, chevrons-up-down, dropdown with profile, the platform "enter tenant / exit tenant" action, and sign out), `PrimaryAction` (context: "Quick add" for tenant admin, "Provision tenant" for platform). |
| `PageHeader` | `page-header.tsx` | Optional breadcrumbs, h1 24px/600 with -0.02em tracking, a 13px muted subtitle, and actions on the end side. |
| `Card`, `CardHeader`, `CardTitle`, `CardSub`, `CardActions` | restyle `ui/card.tsx` | `rounded-lg border border-line bg-surface p-5 shadow-sm`. |
| `StatBlock` | `stat.tsx` | Label, a big tabular number, and a `Delta`. Variants: `sm` (26px), `md` (30px), `lg` (34px). |
| `Delta` | `delta.tsx` | Trending-up icon with `text-accent-strong`, or trending-down with `text-warn`, followed by muted context. |
| `HatchBar` / `ProgressTrack` | `progress.tsx` | Heights: 26px (default), 12px (`sm`), 7px (`xs`). Tone: accent, warn, yellow, danger, soft, idle. |
| `SegmentBar` + `LegendList` | `segment-bar.tsx` | Flex of hatched segments with 3px gaps and 4px radius. Legend rows: swatch, label, value aligned to the end. |
| `StackedBarChart` | `charts/stacked-bar.tsx` | Recharts `BarChart` with custom `shape` that renders hatched `<pattern>` fills, `radius={5}`, 3px gap between stacks (render each segment as its own bar with a `stackId` and `stroke="hsl(var(--surface))" strokeWidth={3}`). Active index colored, others `idle`. Tooltip: white card, `shadow-pop`, 10px radius, date header and one row per series. Y axis muted 10.5px, dashed-free 1px gridlines in `--line`. |
| `SegmentGauge` | `charts/gauge.tsx` | SVG semicircle of 14 segments, filled share uses a hatch pattern with rising opacity, center label and sub. |
| `AreaLine` | `charts/area-line.tsx` | Recharts area, 2px accent stroke, gradient fill from 28% to 0, end dot. |
| `MiniBars` | `charts/mini-bars.tsx` | Sparkline bars where the last bar is accent and the others are idle. |
| `ListRow` | `list-row.tsx` | Leading `IconTile` or `Avatar`, a title/subtitle meta block, then an end block with value and `StatusText`. |
| `IconTile` | `icon-tile.tsx` | 32px (or 44px `lg`), 9px radius. Tones: neutral, ink, accent, warn, danger, info. |
| `Avatar` | restyle `ui/avatar.tsx` | Round by default, with a `square` variant (10px radius) for the people row and lists. When there is no photo, show initials on a soft pastel picked from a hash of the name. Optional presence dot: accent for on shift, warn for late, faint for off. |
| `PeopleRow` | `people-row.tsx` | Horizontal scroll of 42px square avatars with the first name under each, like the reference "Quick payment". |
| `QuickActions` | `quick-actions.tsx` | Five square outline tiles with a label under each, like the reference "Top up / Send / Request". |
| `AccentCard` | `accent-card.tsx` | Solid accent card with a soft white circle in the corner, used for plan, workspace, and pay profile. A `mono` variant is used for secondary cards. |
| `TipCard` | `tip-card.tsx` | Title, copy, a link, and the hatched "staircase" grid in the bottom end corner. Used for setup prompts and upsells. |
| `Chip` / `StatusChip` | restyle `ui/badge.tsx` | 22px pill, 11px/600. Tones: ok (accent tint), warn, danger, info, ink, yellow, neutral. `StatusChip` maps the domain status → tone (see 3.1). |
| `StatusText` | `status-text.tsx` | 11px colored text with no background, used in list end blocks. |
| `PillSelect` | `pill-select.tsx` | 28px outline select trigger ("7d ⌄", "October ⌄") built on shadcn `Select`. |
| `Segmented` | `segmented.tsx` | White track with a grey active pill. Used for filters and the theme toggle. |
| `TabsBar` | restyle `ui/tabs.tsx` | Same look as `Segmented`, full width, horizontally scrollable, with an optional count badge. Drive it from the URL (sub-route or `?tab=`), matching what each module does today. |
| `DataTable` | restyle `ui/table.tsx` | No outer border (the card is the border). Header 11px muted, rows 12.5px, row hover `surface-2`, numeric cells end-aligned and tabular, optional `tfoot` total row. |
| `PersonCell` | `person-cell.tsx` | Small avatar, then bold name and a muted sub line. |
| `Drawer` | restyle `ui/sheet.tsx` | Floating panel (`inset-y-2.5 end-2.5`, 24px radius, max 480px), blurred scrim. Header, body, and sticky footer slots. |
| `Field`, `Input`, `Select`, `Textarea`, `Switch`, `Checkbox` | restyle `ui/*` | 40px inputs, 10px radius, `border-line-strong`. Focus ring is `ring-accent/25` with an accent border. The switch is accent when on. |
| `Kanban`, `KanbanColumn`, `KanbanCard` | `kanban.tsx` | Columns 260px wide, `surface-2` with an 18px radius. Cards are white with a 12px radius. |
| `CalendarMonth` | `calendar-month.tsx` | 7-column grid, day cells `surface-2` with a 12px radius, today outlined in ink, events as hatched chips. |
| `DayStrip` | `day-strip.tsx` | 54px day pills. The active one is ink. |
| `Timeline` | `timeline.tsx` | Vertical line with ring dots. Tones: accent, warn, danger. |
| `SessionBar` | `session-bar.tsx` | Horizontal day scale with hatched session blocks. |
| `Steps` | `steps.tsx` | Segmented progress for integration setup and CSV import. |
| `EmptyState`, `Skeleton`, `Notice` | `feedback.tsx` | An icon tile, a title, a sub line, and an optional action. The skeleton uses a shimmer. Notice tones: neutral, warn, accent. |

### 3.1 Status → tone map (one place, `lib/status-tone.ts`)

- ok: approved, active, on shift, clocked in, completed, hired, paid, connected, GA, converted, on track, accepted, resolved, succeeded
- warn: pending, submitted, in progress, trial, lab, contacted, on hold, late, qualified, changes requested, paused, syncing, offer extended
- danger: rejected, failed, missed clock-out, suspended, urgent, overdue, expired, cancelled, off track, past due, critical, withdrawn
- info: new, open, draft, returned, scheduled
- neutral: everything else

Cursor prompt, phase 2:

> Implement Phase 2 of /design/ELEVORA-REDESIGN-PLAN.md. Build the components in section 3 under components/elevora and restyle the listed shadcn components in components/ui to the new tokens. Match the visuals in /design/elevora-redesign-prototype (styles.css and js/core.js have the exact sizes, radii, hatch patterns, chart and gauge geometry). Add a /dev/ui route (dev-only) that renders every component in light and dark so I can review. Do not modify any page yet.

---

## 4. Phase 3: App shell and navigation

- Replace the current layout in `app/app/layout.tsx` (or wherever the shell lives) with `AppFrame` + `Sidebar` + `Topbar`.
- Keep the existing nav builder that decides items from role, plan modules, overrides, and system module roles. Only change how it renders.
- Groups and order:
  - Tenant admin: Operate (Dashboard, Team today, Live map, Clock, Attendance › Day view / Hours report, Alerts), People (Employees, Shifts, Leave › Requests / Balances / Calendar / Policies / Reports, Hiring, Tasks), Perform (KPIs, Analytics › Overview / Alerts, Compensation), System (Integrations, Settings, Billing, Health). Profile and Help sit under a divider.
  - Employee: Me (Clock, History, Alerts), Workspace (My leave, My tasks, My KPIs, My analytics, Team today only if they manage a team). Show module items only if the plan and system module role allow them.
  - Platform super admin: Platform (Overview, Tenants, Subscriptions, Leads, Plans, Features, Payments, Audits, Health).
- Sidebar bottom card by role: admin sees "Upgrade to Scale" when a module is locked by plan (hide it otherwise). Employee sees the offline queue ("2 events queued · Sync now", only when the queue is above 0). Platform sees "Lab workspace · Enter lab".
- Move Branding, Language, Theme, and Sign out out of the sidebar footer (where they are today). Theme and language go in the top bar, Branding goes in Settings, and Sign out goes in the user chip menu.
- Nav labels come from the existing i18n dictionaries. Add any missing Arabic keys.

Cursor prompt, phase 3:

> Implement Phase 3. Replace the app shell with AppFrame/Sidebar/Topbar from components/elevora, keeping the existing nav-entitlement logic untouched. Move theme, language, branding, and sign out as described. Match /design/elevora-redesign-prototype (open #/app as each role via the user chip). Verify RTL mirrors the sidebar to the right and that the active bar sits on the start edge.

---

## 5. Phase 4: Pages (layout spec per page)

Grid shorthand: `G12` is a 12-column grid with a 14px gap. `rail` is `minmax(0,1fr) 300px`, which collapses to one column below 1080px. Card spans are given as `c-N`.

### 5.1 Tenant dashboard `/app` (closest to the reference)

- PageHeader: "Good morning, {name}", date subtitle, actions "Open live map" (outline) and "Review leave · {pending}" (ink).
- `rail` layout.
  - Main column, G12:
    - c-12 hero card, split `1fr 210px`. Left: big "38 / 52" "Clocked in now", PillSelect "This week", chart-type icon toggles, legend (On time / Late / Overtime), and a StackedBarChart of the week with today active. Right `kpi-col` with a start border: Live on map, Unread alerts (with a missed clock-out count in warn), Attendance rate.
    - c-6 "Seat usage" (like "Monthly spending limit"): HatchBar of seats used out of the seat limit, with a pencil linking to Billing.
    - c-6 TipCard "Finish setting up your workspace": "{done} of 9 done", link to the next incomplete step, and the staircase. Hide it once all 9 are done and show a "Goals and leave" summary instead.
    - c-4 "Leave mix" (like "Cost analysis"): total days, SegmentBar by leave type, LegendList with percentages.
    - c-4 "Attendance health" (like "Financial health"): sessions count, delta, SegmentGauge of the on-time share.
    - c-4 "KPI attention" (like "Goal tracker"): "+ Add KPI", up to 4 KPI rows with an icon tile, value/target, and a sm HatchBar.
  - Rail: "Workspace" card with an AccentCard (plan, tenant, seats, renewal), QuickActions (Add employee, Announce, Approve, Export hours, More), PeopleRow "Clocked in now". Below it, a "Live activity" card (like "Transaction history") listing clock, leave, zone, and task events with time and StatusText.
- The data sources are the existing dashboard queries (presence, alerts, KPI count, leave queue, setup checklist). Add attendance week aggregates if they are not exposed yet. If that is too much for this pass, render an EmptyState instead of fake data.

### 5.2 Clock `/app/clock` (employee home)

- G12: c-7 main clock card and c-5 stack.
- Main card: date and shift window, chips (Mobile / Fixed zone, On shift / On break / Off). A 240px progress ring (accent stroke, share of shift elapsed) around a 168px round button. Clock in uses the hatched accent, Clock out uses ink. Under it: Start/End break and the offline queue chip. When on break, show an accent notice about leaving the zone. A "Today" timeline lists events.
- Stack: "Today" 2×2 tiles (Clocked in, Expected out, Break, Overtime) with a SessionBar. "Overtime prompt" card (shown only in the grace window) with Clock out and "Stay · overtime". "This week" hours with MiniBars and a History link.
- Keep the geofence error states and show them in a warn Notice.

### 5.3 Attendance `/app/attendance` and History (employee)

- A DayStrip card with month PillSelect and prev/next arrows.
- An auto-fill grid (min 320px) of person cards: avatar with presence, a status chip, a SessionBar, and a session list. Admins get a "Correct" button on each session that opens the Correct session drawer (clock-out time and note).
- Admin header action: "Hours report".

### 5.4 Hours report `/app/attendance/hours`

- Breadcrumb. Segmented range control (This month / Last month / Custom) and an ink "Export CSV" button.
- Four StatBlocks (shift, overtime, total, average per person).
- DataTable: Employee (PersonCell), Date, Shift hours, Overtime (a warn chip if above 0), Total (bold), and a tfoot total row.

### 5.5 Team today `/app/team`

- Branch Segmented filter. Four stat cards (Clocked in, Late, Clocked out, On leave), each with an avatar stack.
- DataTable: person with presence, branch, presence mode, clock-in time, status chip, analytics icon link.

### 5.6 Live map `/app/map` (+ History mode)

- Header actions: "Appearance" (drawer) and a Live/History segmented control.
- `rail`: map card (18px radius) with a floating filter card at the top start (search, on-shift and last-seen chips) and a floating "Draw work zone" ink button at the bottom start. Rail list of people with last update, or a Timeline trail in History mode.
- Markers are 34px circles with a 3px surface border and initials. On shift is accent, last seen is grey. The work zone is a dashed accent circle at 12% fill. The history trail is a dotted accent polyline.
- Base map: keep the current Leaflet setup. In light mode, apply a grayscale tile filter. In dark mode, use invert + grayscale (`filter: invert(1) grayscale(1) brightness(.78) contrast(1.15)`), or a dark style if your tile provider has one. The map appearance settings stay the source of truth. Map their presets onto this.
- Drawers: Map appearance (theme preset cards, marker style, color swatches, initials toggle) and Work zone (employee, center, radius slider).

### 5.7 Alerts `/app/notifications`

- Admin TabsBar: Inbox (count), Event alerts, Custom rules, Announcements. Employees see only the inbox.
- Inbox toolbar: category Segmented, urgency PillSelect, "Unread only" switch, "Mark all read". The list card uses ListRow (icon tile in warn for high urgency, an accent dot for unread, category chips, time, "Mark read").
- Event alerts: one card per category (c-6) with a switch per built-in rule.
- Custom: DataTable of rules with edit and delete icon buttons, plus "New rule".
- Announcements: c-5 compose card and c-7 sent list.

### 5.8 Employees `/app/employees`

- Header actions: Org setup, Import CSV (drawer with Steps: Upload → Review → Commit, a dashed drop zone, an incomplete-rows warn notice, and a template link), Export, and "Add employee" (ink, drawer).
- Toolbar: search (name, email, phone), branch, role, and status PillSelects, plus a presence Segmented control.
- DataTable: Employee (PersonCell with email), Title, Branch, Manager, Access (ink "Admin" chip plus accent chips for system module roles), Presence (icon and mode), Status, and Open.
- Employee drawer: header avatar, tabs (Profile, Documents, Skills, Training, Assessments, Sign-in), a 2-column field grid, a system module role chip row, an HR file ListRows with expiry StatusText, and a footer with Analytics and Edit profile. Show the temporary password once in a Notice after create.

### 5.9 Org setup `/app/settings/org`

- c-7 Branches and sites (ListRow with an ink building tile and a people count chip). c-5 Job roles as chips with "+ Add".

### 5.10 Shifts `/app/shifts`

- c-8 Upcoming instances table (window, flag chips). c-4 stack: Break policy (minutes and a fixed/choose Segmented control) and Active patterns (LegendList and SegmentBar).
- c-12 Left-zone incidents: ListRow with "Approve emergency" and "Mark deduction" (danger text).
- "Set pattern" opens a drawer with daily/weekly/monthly, weekdays or days of the month, start and end times, and deactivate.

### 5.11 Leave `/app/leave` (+ balances, calendar, policies, reports)

- TabsBar across sub-routes (Policies is admin only).
- Requests: `rail`. Main: a status Segmented filter, a type PillSelect, and a DataTable (Employee, Dates, Length, Kind chip where emergency is warn, Status chip with a conflict or attachment warning under it, Review). Rail: a "New request" card (type, Segmented length Full / 1st half / 2nd half / Hours, from and to, a conflict warn notice, Submit) and an "Annual balance" card with a HatchBar.
- Review drawer: conflict notice, Balance / After / Pending tiles, Timeline, decision note, and a footer with Return, Reject (danger), and Approve (ink).
- Balances: four balance cards with HatchBars, then a Ledger table with entry-type chips (accrual is ok, deduction warn, expiry danger, pending reserve info) and signed day values.
- Calendar: CalendarMonth with a hatched event chip per leave type, plus a legend and a branch PillSelect.
- Policies: a matrix table (leave type × track balance, approval, attachment, paid, half days, emergency) with Switches, plus "Notification settings" and "New leave type".
- Reports: four StatBlocks, a usage-by-month StackedBarChart, and a Decisions gauge.

### 5.12 Hiring `/app/hiring` (9 tabs)

- Dashboard: four StatBlocks, a c-8 Funnel (labeled HatchBars), c-4 Urgent ListRows, and c-12 "Interviews today" tiles.
- Job openings: DataTable (role and branch, hiring manager, recruiter, candidate count, status) and "New job".
- Pipeline: a Kanban with the 11 stages. Cards show avatar, name, role, source chip, and days in stage. Keep the existing move action, whether it is drag or a menu.
- Candidates: toolbar (search, status, source, "Parse resume", "Add candidate") and a table with a fit HatchBar (xs).
- Interviews: a c-7 week list with date tiles and a c-5 Scorecard (5-step hatched rating bars, recommendation chip).
- Offers: table with status. Hired: ListRow with "Add to roster". Best fit: ranked cards with score and skill chips. Reports: StatBlocks and source bars.
- Scope rule: hiring managers and interviewers see the same layout with filtered data.

### 5.13 Tasks `/app/tasks`

- Four StatBlocks, then a toolbar (search, status Segmented, batch PillSelect for admins).
- An auto-fill card grid (min 300px). Each card: priority chip (low neutral, medium info, high warn, urgent danger), status chip, title, due date, and deliverable type. Individual tasks show a batch completion HatchBar ("3/8"). Shared tasks show "Shared · one activity log". The card ends with an avatar stack and tag chips.
- New task drawer: Shared and Individual choice cards, priority, due date, deliverable Segmented, and a "Require review" switch.
- The task detail drawer keeps the deliverables (link or file) and activity log.

### 5.14 KPIs `/app/kpis` (People/Me, Metrics, Insights, Reports)

- Admin People: an auto-fill grid of person scorecards (avatar, overall score, a HatchBar that turns warn below 75, "4 local KPIs · 3 CMS Goals", and an On/Off track chip).
- Employee Me: a c-5 overall SegmentGauge, a c-7 local KPI list with weights, and a c-12 CMS Goals card. These stay separate sections with separate totals. Never blend them.
- Metrics: table (metric and category, target, result, weight, progress bar, "Acknowledge" accent button or Acknowledged chip).
- Insights: score-by-category bar chart, a benchmark gauge, and "Pull attendance actuals".
- Reports: an export form card.

### 5.15 Compensation `/app/compensation` (8 tabs)

- Overview: StatBlocks, a c-7 Payroll mix SegmentBar (base, allowances, variable, overtime), and c-5 Recent changes ListRows.
- Employees: pay profile table, plus a profile drawer (AccentCard total, component list, Payslip preview, Propose change).
- History: Timeline. Allowances: a card grid (icon tile, people count chip, amount). Approvals: one card per change with Return, Reject, and Approve, plus a note. Bonus / commission: a table. Payroll inputs: a period PillSelect, "Manual adjustment", export, and a numeric table. Reports: a trend AreaLine and a payslip preview card.

### 5.16 Analytics `/app/analytics` + employee, branch, alerts, me

- Header: Last 7 days / Full range Segmented, Performance and "Alerts · N" buttons.
- Six snapshot cards in an auto-fit grid. Each is clickable and opens the per-person breakdown drawer or page. Contents: label, icon, big value, delta.
- c-8 Trend StackedBarChart (jobs and visits) with a tooltip, and c-4 Revenue linked AreaLine.
- c-12 By branch table with an attendance HatchBar (xs) and Open.
- Employee page: breadcrumb, four stat cards with MiniBars, a daily series AreaLine, a GPS updates vs expected gauge, and an event Timeline.
- Branch page: the same snapshot sliced to one branch, plus a top-people list. Alerts page: table with Acknowledge and Resolve. `/me` redirects as it does today.

### 5.17 Integrations `/app/integrations` and `/[id]`

- A "Connected" grid of cards (ink icon tile, status chip, description, last sync, Manage), then a "Catalog" grid where coming-soon items are dimmed with a chip.
- Detail: header actions Pause/Activate, "Replay dead letters · N", and ink "Sync now". A Steps card for setup progress (Base URL → Endpoints → Authentication → Field mappings → Test fetch → Sync). A c-7 field mappings table, c-5 unmatched identities with Link, and a c-12 sync runs table.

### 5.18 Settings, Billing, Health, Profile

- Settings: a c-7 Branding card (logo drop tile, display name, color preset swatches that switch `data-accent` live, Save) and a c-5 stack of link cards (Org setup, Live map appearance, Billing, Leave policies).
- Billing: a c-5 AccentCard for the current plan (seats, renewal, price) with a seats slider, "Update seats", and "Cancel at period end" (in-app confirmation dialog). A c-7 plan cards grid with "Switch plan" and Enterprise "Talk to sales". A c-12 invoices table. "Billing portal" goes in the header. Keep the checkout status polling.
- Health: four metric cards (icon tile, MiniBars, value, label) and a recent events Timeline. The same view is used at platform scope.
- Profile: a c-7 card with an xl avatar, upload-with-crop and remove, name and email fields. A c-5 Preferences card with language and theme Segmented controls.

### 5.19 Platform admin

- Overview `/app` (super admin, no tenant): `rail`. The hero card shows Estimated MRR as a big number, a stacked bar of new vs expansion by month, and a kpi-col (Active paid tenants, Open trials, Demos 7d / 30d). Then a c-6 tenants-by-status SegmentBar, a c-6 lead funnel bars. Rail: Recent leads and Payment events lists.
- Tenants: toolbar (search, status Segmented, plan PillSelect) and a table (org with square avatar and slug, plan chip, seats, admin, region, status, Details, ink "Open"). Provision drawer.
- Tenant detail: header actions Suspend/Activate, Soft-delete (danger, with confirm), ink "Open workspace". A c-5 plan AccentCard with Assign plan, a c-7 modules grid with switches (overrides), and c-4 cards each for linked leads, recent payments, and recent audits.
- Subscriptions, Payments, Audits: DataTables with status chips, provider chips, and monospace event or action names.
- Leads: Kanban by status (new, contacted, qualified, converted, closed).
- Plans: matrix table (plan, price, seat limits, then accent check chips for field ops, people ops, analytics, integrations).
- Features: a module card grid with a Draft / Lab / GA Segmented control. Header has "Preview plan" and ink "Enter lab · all unlocked".

### 5.20 Public site

- Shared public shell: the same rounded frame. A sticky blurred nav: logo, Product / Pricing / Book a demo, theme and language toggles, Log in (ghost), Start free trial (ink).
- Home `/`: the hero is two columns. On the left: an eyebrow pill ("New" ink chip + "Integrations: CMS Goals and HubSpot"), a 60px display headline with the key phrase highlighted in an accent block ("from one place."), the lede, ink "Start 14-day free trial" plus outline "Book a demo", and three trust ticks. On the right: a product composite (hero chart card, floating "31 on the map" chip, floating leave-request card). Then a module strip (6 cards), How it works (3 numbered cards with HatchBars), a product bento (attendance chart 4×2, KPI gauge, offline card, hiring TipCard, compensation SegmentBar), Who it is for (4 cards), and an ink CTA band with the staircase.
- Pricing `/pricing`: centered heading, a seat slider card that updates the price on every plan card live, 4 plan cards (the featured one is inverted ink with an accent CTA), and an Enterprise strip.
- Log in / Sign up: split screen. The form panel is on the start side (logo, h1, fields, ink full-width submit, a "Google and Microsoft sign-in are coming soon" notice, and a switch link). The art panel on the end side holds the product composite and a one-line claim. Below 1080px only the form shows. Sign up adds a team-size Segmented control and the terms line.
- Book a demo `/demo`: two columns, with copy and three walkthrough rows on the left and a form card on the right (name, company, email, phone, message). Submit still creates a platform lead.
- Privacy and Terms: a sticky section nav on the start side and 720px prose.

Cursor prompt, phase 4 (run once per group; do not do all pages in one go):

> Implement Phase 4, section 5.X ({page names}) of /design/ELEVORA-REDESIGN-PLAN.md using only components from components/elevora and components/ui. Keep every existing query, mutation, permission check, and route. Match the matching screen in /design/elevora-redesign-prototype (route shown in "All pages"). Where the new layout shows data the page does not currently load, use an EmptyState or hide the widget rather than adding fake data, and list those gaps for me at the end. Check light, dark, and Arabic RTL, at 1440px and 390px.

Suggested batches, in order:
1. 5.1 Dashboard, 5.2 Clock, 5.3 Attendance, 5.4 Hours
2. 5.5 Team, 5.6 Live map, 5.7 Alerts
3. 5.8 Employees, 5.9 Org setup, 5.10 Shifts
4. 5.11 Leave
5. 5.12 Hiring
6. 5.13 Tasks, 5.14 KPIs
7. 5.15 Compensation, 5.16 Analytics
8. 5.17 Integrations, 5.18 Settings / Billing / Health / Profile
9. 5.19 Platform admin
10. 5.20 Public site

---

## 6. Phase 5: States, motion, and polish

- Loading: every card uses a Skeleton block of the same size (no spinners in cards). Tables show 5 skeleton rows.
- Empty: use the EmptyState component with a short active-voice line and one action, for example "No leave requests yet · New request".
- Errors: a warn Notice inside the card with "Retry".
- Motion: 150ms color and background transitions. Drawers use 250ms `cubic-bezier(.2,.8,.2,1)`. Bars grow from 0 on first mount (300ms, stagger 30ms), and this is disabled under `prefers-reduced-motion`.
- Focus: a 2px accent outline with 2px offset on every interactive element.
- Contrast: accent text on white is too light for body copy, so use `accent-strong` for text and `accent` only for fills. Check the dark mode chips.
- Numbers: add `tabular` to every numeric cell, stat, and time.
- Copy: keep labels to 7 words or fewer. Write "Export CSV", not "Click to export your data".

Cursor prompt, phase 5:

> Implement Phase 5 across all pages: skeletons, empty and error states, motion with reduced-motion support, focus rings, and tabular numbers. Then run a pass that finds any remaining hardcoded colors, left/right utilities, serif font usage, or old background gradients, and replace them with tokens and logical properties. Report every file changed.

---

## 7. QA checklist (sign off per page)

- [ ] Matches the prototype layout at 1440px. No overflow at 390px. The sidebar becomes a sheet below 1080px.
- [ ] Light and dark both use only tokens. There are no white flashes on first load, because the theme is set before paint.
- [ ] Arabic: the layout mirrors, chart and time direction stays LTR, directional icons flip, and IBM Plex Sans Arabic renders.
- [ ] Tenant color preset (lime, teal, emerald, violet) recolors every accent fill, chart, switch, and focus ring.
- [ ] Role views: tenant admin, employee (with and without each system module role), hiring manager, and platform super admin, both inside and outside a tenant.
- [ ] Plan gating: modules not on the plan are hidden from the nav, and the upsell card appears.
- [ ] Loading, empty, and error states exist for every card.
- [ ] Keyboard: tab order, ESC closes drawers, ⌘K opens search.
- [ ] No behavior regressions in clock in/out, break, overtime prompt, offline queue, leave decisions, CSV import, billing actions, or integration sync.

---

## 8. Files delivered with this plan

- `elevora-redesign-prototype/`: a clickable static prototype of every page listed here (75+ screens). Open `index.html`. The bottom bar switches between Site and App, opens All pages, toggles light/dark, and changes the accent preset. Change roles from the user chip in the top bar.
  - `styles.css`: the exact tokens and component CSS. This is the reference for sizes, radii, and hatch patterns.
  - `js/core.js`: chart, gauge, and hatch helpers. Copy the gauge geometry and bar chart structure into the React components.
  - `js/shell.js`: nav structure per role, plus the Arabic nav labels.
  - `js/pages-*.js`: per-page layouts.
