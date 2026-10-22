"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type HatchTone =
  | "accent"
  | "warn"
  | "yellow"
  | "danger"
  | "soft"
  | "idle";

const hatchClass: Record<HatchTone, string> = {
  accent: "hatch",
  warn: "hatch-warn",
  yellow: "hatch-yellow",
  danger: "hatch-danger",
  soft: "hatch-soft",
  idle: "hatch-idle",
};

const trackHeight = {
  default: "h-[26px]",
  sm: "h-3",
  xs: "h-[7px]",
} as const;

export type ProgressTrackProps = React.HTMLAttributes<HTMLDivElement> & {
  size?: keyof typeof trackHeight;
};

export function ProgressTrack({
  className,
  size = "default",
  ...props
}: ProgressTrackProps) {
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-xs bg-surface-2",
        trackHeight[size],
        className,
      )}
      {...props}
    />
  );
}

export type HatchBarProps = {
  percent: number;
  tone?: HatchTone;
  size?: keyof typeof trackHeight;
  animate?: boolean;
  className?: string;
};

export function HatchBar({
  percent,
  tone = "accent",
  size = "default",
  animate = true,
  className,
}: HatchBarProps) {
  const clamped = Math.min(100, Math.max(0, percent));
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  return (
    <ProgressTrack size={size} className={className}>
      <span
        className={cn(
          "block h-full origin-start rounded-xs",
          hatchClass[tone],
          animate && mounted && "hatch-grow",
        )}
        style={{ width: `${clamped}%` }}
      />
    </ProgressTrack>
  );
}
