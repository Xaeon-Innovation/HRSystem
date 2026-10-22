import * as React from "react";
import { cn } from "@/lib/utils";
import type { HatchTone } from "./progress";

const hatchClass: Record<HatchTone, string> = {
  accent: "hatch",
  warn: "hatch-warn",
  yellow: "hatch-yellow",
  danger: "hatch-danger",
  soft: "hatch-soft",
  idle: "hatch-idle",
};

export type SegmentBarItem = {
  value: number;
  tone?: HatchTone;
  label?: string;
};

export type SegmentBarProps = {
  segments: SegmentBarItem[];
  className?: string;
};

export function SegmentBar({ segments, className }: SegmentBarProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  return (
    <div
      className={cn(
        "flex h-[26px] w-full gap-[3px] overflow-hidden rounded-[4px]",
        className,
      )}
    >
      {segments.map((seg, i) => (
        <span
          key={i}
          className={cn("min-w-0", hatchClass[seg.tone ?? "accent"])}
          style={{ flex: seg.value / total }}
        />
      ))}
    </div>
  );
}

export type LegendItem = {
  label: string;
  value: React.ReactNode;
  tone?: HatchTone;
};

export type LegendListProps = {
  items: LegendItem[];
  className?: string;
};

export function LegendList({ items, className }: LegendListProps) {
  return (
    <ul className={cn("space-y-2 text-sm", className)}>
      {items.map((item, i) => (
        <li key={i} className="flex items-center gap-2">
          <span
            className={cn(
              "h-3 w-3 shrink-0 rounded-[3px]",
              hatchClass[item.tone ?? "accent"],
            )}
          />
          <span className="min-w-0 flex-1 text-ink-2">{item.label}</span>
          <span className="tabular font-semibold text-ink">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}
