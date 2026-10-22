# 02 — UI kit

Source of truth: [`design/elevora-mobile-prototype/styles.css`](../../../design/elevora-mobile-prototype/styles.css). Components live in `apps/mobile/components/ui`. Hidden route `/dev/ui` renders all in light, dark, and RTL.

## Tokens (export via `packages/tokens`)

### Light

| Token | Value |
|---|---|
| accent | `#9ACD32` (strong `#6FA01B`, soft `#C9E98A`, tint `#EEF7DC`, ink `#1A2600`) |
| warn / yellow / danger / info | `#F4A259` / `#EFE444` / `#E5484D` / `#3E8BFF` |
| canvas / frame / surface / surface-2 / surface-3 | `#E6E6E3` / `#F6F6F4` / `#FFF` / `#F3F3F1` / `#EAEAE7` |
| line / line-strong | `#ECECE9` / `#DEDEDA` |
| text / text-2 / muted / faint | `#121212` / `#4A4A47` / `#8E8E89` / `#BDBDB8` |
| bar-idle / ink | `#EBEBE8` / `#121212` |
| map land/block/park/water/road | `#F1F0EC` / `#E6E5E0` / `#DCEBC6` / `#CFE1EA` / `#FFF` |

### Dark

Surfaces: canvas `#050606`, frame `#0F1011`, surface `#17181A` / `#1D1F21` / `#26282B`. Map land `#141618`, water `#0E1A21`, roads `#272A2E`. Accent strong `#A9D84A`.

### Accent presets

Lime (default), teal (`#23A7C7`), plus emerald/violet later as on web tenants (`accentPreset` from `me.tenant`).

### Fonts

- EN: General Sans (bundle OTFs)
- AR: IBM Plex Sans Arabic via `expo-font`
- Switch family by locale; logical CSS (`ms-`/`me-`/`ps-`/`pe-`/`start-`/`end-`). Rings, time bars, map do **not** mirror.

### Hatch

135°, 4px stripe / 9px period. One `<Hatch tone>` SVG pattern: accent, warn, yellow, danger, info, idle.

## Radii and sizes

| Element | Spec |
|---|---|
| Card | 22px radius |
| Primary button | height 50px, radius 16px; `.sm` 38px / 12px |
| Chip | height 24px, pill |
| Sheet | 34px top radius, grab handle, scrim (`@gorhom/bottom-sheet`) |
| TextField | height 52px |
| Icon tile | 40×40, radius 13 (sm 32 / 10) |
| Avatar | 42×42, radius 14; presence dot 11px |
| Floating tab bar | height 66px, radius 24, inset-inline 12px, bottom 22px; active accent tick 22×3; badge 16px |
| Clock ring | 236×236, stroke 10, SVG center (118,118), R=108 |
| Clock button | 172×172 circle; in = hatch accent, out = ink, break = hatch warn |
| Screen body | padding bottom 110px for tab bar; background `frame` |
| Day strip cell | 48×66, radius 16 |

## Components checklist

- `Screen`, `FloatingTabBar`, `AppHeader`, `NavHeader`
- `Card`, `Section`, `ListRow`, `IconTile`, `Avatar`, `Chip`, `StatusChip`
- `Button`, `Segmented`, `Switch`, `TextField`, `TextArea`, `DateRangeCalendar`, `DayStrip`
- `Hatch`, `ProgressTrack`, `SegmentBar`, `ClockRing`, `ClockButton`, `SessionBar`, `Timeline`
- `Sheet`, `Notice`, `OfflineBanner`, `SyncPill`
- `MapView`, `MiniMap`
- `EmptyState`, `Skeleton`

Acceptance: side-by-side with prototype Interactive mode; light + dark + RTL pass on `/dev/ui`.
