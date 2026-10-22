import type { ReactNode } from "react";
import Svg, { Circle, Path, Rect, type SvgProps } from "react-native-svg";
import { useTheme } from "@/lib/theme";

type IconProps = SvgProps & { size?: number; color?: string };

/** Light-theme hexes still passed from screens — remap so dark mode stays readable. */
function resolveStroke(
  color: string | undefined,
  colors: { text: string; muted: string; faint: string },
) {
  if (!color || color === "currentColor" || color === "#121212") {
    return colors.text;
  }
  if (color === "#8E8E89" || color === "#4A4A47") return colors.muted;
  if (color === "#BDBDB8") return colors.faint;
  return color;
}

function IconShell({
  size = 21,
  color,
  children,
  ...rest
}: IconProps & { children: ReactNode }) {
  const { colors } = useTheme();
  const stroke = resolveStroke(color, colors);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </Svg>
  );
}

export function IconHouse(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
        <Path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      </>
    </IconShell>
  );
}

export function IconMap(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
        <Path d="M15 5.764v15" />
        <Path d="M9 3.236v15" />
      </>
    </IconShell>
  );
}

export function IconCalendarClock(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
        <Path d="M16 2v4" />
        <Path d="M8 2v4" />
        <Path d="M3 10h5" />
        <Path d="M17.5 17.5 16 16.3V14" />
        <Circle cx={16} cy={16} r={6} />
      </>
    </IconShell>
  );
}

export function IconListChecks(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="m3 17 2 2 4-4" />
        <Path d="m3 7 2 2 4-4" />
        <Path d="M13 6h8" />
        <Path d="M13 12h8" />
        <Path d="M13 18h8" />
      </>
    </IconShell>
  );
}

export function IconTreePalm(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M13 8c0-2.76 2.46-5 5.5-5 .32 0 2.5.5 2.5.5S19.68 5 19.5 7.5c0 2.76-2.46 5-5.5 5" />
        <Path d="M13 8c0-2.76-2.46-5-5.5-5C7.18 3 5 3.5 5 3.5S4.32 5 4.5 7.5c0 2.76 2.46 5 5.5 5" />
        <Path d="M12 22V10" />
        <Path d="M8 22h8" />
      </>
    </IconShell>
  );
}

export function IconBell(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M10.268 21a2 2 0 0 0 3.464 0" />
        <Path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
      </>
    </IconShell>
  );
}

export function IconFingerprint(p: IconProps) {
  return (
    <IconShell {...p} size={p.size ?? 30}>
      <>
        <Path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4" />
        <Path d="M14 13.12c0 2.38 0 6.38-1 8.88" />
        <Path d="M17.29 21.02c.12-.6.43-2.3.5-3.02" />
        <Path d="M2 12a10 10 0 0 1 18-6" />
        <Path d="M2 16h.01" />
        <Path d="M21.8 16c.2-2 .131-5.354 0-6" />
        <Path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2" />
        <Path d="M8.65 22c.21-.66.45-1.32.57-2" />
        <Path d="M9 6.8a6 6 0 0 1 9 5.2v2" />
      </>
    </IconShell>
  );
}

export function IconLocate(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M2 12h3" />
        <Path d="M19 12h3" />
        <Path d="M12 2v3" />
        <Path d="M12 19v3" />
        <Circle cx={12} cy={12} r={7} />
        <Circle cx={12} cy={12} r={3} />
      </>
    </IconShell>
  );
}

export function IconSun(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Circle cx={12} cy={12} r={4} />
        <Path d="M12 2v2" />
        <Path d="M12 20v2" />
        <Path d="m4.93 4.93 1.41 1.41" />
        <Path d="m17.66 17.66 1.41 1.41" />
        <Path d="M2 12h2" />
        <Path d="M20 12h2" />
        <Path d="m6.34 17.66-1.41 1.41" />
        <Path d="m19.07 4.93-1.41 1.41" />
      </>
    </IconShell>
  );
}

export function IconHistory(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <Path d="M3 3v5h5" />
        <Path d="M12 7v5l4 2" />
      </>
    </IconShell>
  );
}

export function IconPackage(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
        <Path d="M12 22V12" />
        <Path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
        <Path d="m7.5 4.27 9 5.15" />
      </>
    </IconShell>
  );
}

export function IconClipboardCheck(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Rect width={8} height={4} x={8} y={2} rx={1} ry={1} />
        <Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <Path d="m9 14 2 2 4-4" />
      </>
    </IconShell>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M5 12h14" />
        <Path d="M12 5v14" />
      </>
    </IconShell>
  );
}

export function IconX(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M18 6 6 18" />
        <Path d="m6 6 12 12" />
      </>
    </IconShell>
  );
}

export function IconCoffee(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M10 2v2" />
        <Path d="M14 2v2" />
        <Path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
        <Path d="M6 2v2" />
      </>
    </IconShell>
  );
}

export function IconRadio(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9" />
        <Path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5" />
        <Circle cx={12} cy={12} r={2} />
        <Path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5" />
        <Path d="M19.1 4.9C23 8.8 23 15.1 19.1 19" />
      </>
    </IconShell>
  );
}

export function IconSearch(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Circle cx={11} cy={11} r={8} />
        <Path d="m21 21-4.3-4.3" />
      </>
    </IconShell>
  );
}

export function IconLayers(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z" />
        <Path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
        <Path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      </>
    </IconShell>
  );
}

export function IconCalendar(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M8 2v4" />
        <Path d="M16 2v4" />
        <Rect width={18} height={18} x={3} y={4} rx={2} />
        <Path d="M3 10h18" />
      </>
    </IconShell>
  );
}

export function IconMapPin(p: IconProps) {
  return (
    <IconShell {...p}>
      <>
        <Path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
        <Circle cx={12} cy={10} r={3} />
      </>
    </IconShell>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <IconShell {...p}>
      <Path d="m9 18 6-6-6-6" />
    </IconShell>
  );
}

export function IconChevronLeft(p: IconProps) {
  return (
    <IconShell {...p}>
      <Path d="m15 18-6-6 6-6" />
    </IconShell>
  );
}

export function IconPlay(p: IconProps) {
  return (
    <IconShell {...p}>
      <Path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
    </IconShell>
  );
}

