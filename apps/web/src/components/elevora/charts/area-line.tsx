"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type AreaLineProps = {
  values: number[];
  height?: number;
  width?: number;
  className?: string;
};

export function AreaLine({
  values,
  height = 120,
  width = 520,
  className,
}: AreaLineProps) {
  const uid = React.useId().replace(/:/g, "");
  if (values.length < 2) return null;

  const mx = Math.max(...values);
  const mn = Math.min(...values);
  const range = mx - mn || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    height - 8 - ((v - mn) / range) * (height - 20),
  ] as const);

  const d = pts
    .map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1]!;

  return (
    <div dir="ltr" className={cn("w-full", className)}>
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block w-full"
      style={{ height }}
      aria-hidden
    >
      <defs>
        <linearGradient id={`area-${uid}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--accent))" stopOpacity="0.28" />
          <stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#area-${uid})`} />
      <path
        d={d}
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      <circle
        cx={last[0]}
        cy={last[1]}
        r={4}
        fill="hsl(var(--surface))"
        stroke="hsl(var(--accent))"
        strokeWidth={2}
      />
    </svg>
    </div>
  );
}
