"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SegmentGaugeProps = {
  percent: number;
  label: React.ReactNode;
  sub?: React.ReactNode;
  className?: string;
};

export function SegmentGauge({ percent, label, sub, className }: SegmentGaugeProps) {
  const uid = React.useId().replace(/:/g, "");
  const segs = 14;
  const r = 90;
  const cx = 110;
  const cy = 105;
  const gap = 2.2;
  const filledCount = (Math.min(100, Math.max(0, percent)) / 100) * segs;

  const paths: React.ReactNode[] = [];
  for (let i = 0; i < segs; i++) {
    const a0 = Math.PI + (Math.PI / segs) * i + (gap * Math.PI) / 180 / 2;
    const a1 = Math.PI + (Math.PI / segs) * (i + 1) - (gap * Math.PI) / 180 / 2;
    const ro = r;
    const ri = r - 26;
    const p = (a: number, rr: number) => {
      const x = +(cx + rr * Math.cos(a)).toFixed(3);
      const y = +(cy + rr * Math.sin(a)).toFixed(3);
      return `${x},${y}`;
    };
    const filled = i < filledCount;
    const op = filled ? +(0.55 + 0.45 * (i / segs)).toFixed(4) : 1;
    paths.push(
      <path
        key={i}
        d={`M${p(a0, ro)} A${ro},${ro} 0 0 1 ${p(a1, ro)} L${p(a1, ri)} A${ri},${ri} 0 0 0 ${p(a0, ri)} Z`}
        fill={filled ? `url(#hatchG-${uid})` : "hsl(var(--bar-idle))"}
        opacity={op}
      />,
    );
  }

  return (
    <div className={cn("relative mx-auto w-full max-w-[260px]", className)}>
      <svg viewBox="0 0 220 118" className="block w-full" aria-hidden>
        <defs>
          <pattern
            id={`hatchG-${uid}`}
            width="7"
            height="7"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <rect width="7" height="7" fill="hsl(var(--accent))" />
            <rect width="3" height="7" fill="rgb(255 255 255 / 0.28)" />
          </pattern>
        </defs>
        {paths}
      </svg>
      <div className="absolute inset-x-0 bottom-1.5 text-center">
        <div className="text-stat font-semibold tabular text-ink">{label}</div>
        {sub ? <div className="text-xs text-ink-muted">{sub}</div> : null}
      </div>
    </div>
  );
}
