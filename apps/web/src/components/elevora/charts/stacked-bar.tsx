"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type StackedBarDay = {
  label: string;
  values: number[];
};

export type StackedBarChartProps = {
  seriesLabels: string[];
  days: StackedBarDay[];
  activeIndex?: number;
  max?: number;
  min?: number;
  className?: string;
};

export function StackedBarChart({
  seriesLabels,
  days,
  activeIndex = -1,
  max = 30,
  min = -10,
  className,
}: StackedBarChartProps) {
  const uid = React.useId().replace(/:/g, "");
  const [tip, setTip] = React.useState<{
    x: number;
    y: number;
    day: StackedBarDay;
    index: number;
  } | null>(null);

  const range = max - min;
  const ticks = 5;
  const yLabels = Array.from({ length: ticks }, (_, i) =>
    Math.round(max - (range / (ticks - 1)) * i),
  );
  const plotH = 160;
  const barW = 28;
  const gap = 10;

  return (
    <div className={cn("relative flex gap-2", className)} dir="ltr">
      <div className="flex w-8 shrink-0 flex-col justify-between py-1 text-[10.5px] text-ink-muted">
        {yLabels.map((v) => (
          <span key={v} className="tabular leading-none">
            {v}
          </span>
        ))}
      </div>
      <div className="relative min-w-0 flex-1">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 flex flex-col justify-between"
          style={{ height: plotH }}
        >
          {yLabels.map((_, i) => (
            <span key={i} className="h-px bg-line" />
          ))}
        </div>
        <div className="flex items-end" style={{ height: plotH, gap }}>
          {days.map((day, di) => {
            const isOn = di === activeIndex || activeIndex < 0;
            const total = day.values.reduce((a, b) => a + b, 0);
            let yOff = 0;
            return (
              <div
                key={di}
                className="relative flex flex-col items-center"
                style={{ width: barW }}
                onMouseEnter={(e) =>
                  setTip({
                    x: e.clientX,
                    y: e.clientY,
                    day,
                    index: di,
                  })
                }
                onMouseLeave={() => setTip(null)}
              >
                <svg width={barW} height={plotH} className="overflow-visible">
                  <defs>
                    {seriesLabels.map((_, si) => (
                      <pattern
                        key={si}
                        id={`sb-${uid}-${si}`}
                        width="6"
                        height="6"
                        patternUnits="userSpaceOnUse"
                        patternTransform="rotate(45)"
                      >
                        <rect width="6" height="6" fill="hsl(var(--accent))" />
                        <rect width="2.5" height="6" fill="rgb(255 255 255 / 0.28)" />
                      </pattern>
                    ))}
                    <pattern
                      id={`sb-idle-${uid}`}
                      width="6"
                      height="6"
                      patternUnits="userSpaceOnUse"
                      patternTransform="rotate(45)"
                    >
                      <rect width="6" height="6" fill="hsl(var(--bar-idle))" />
                      <rect width="2.5" height="6" fill="hsl(var(--bar-idle-stripe))" />
                    </pattern>
                  </defs>
                  {day.values.map((v, si) => {
                    const h = (Math.abs(v) / range) * plotH;
                    const y = plotH - yOff - h;
                    yOff += h;
                    return (
                      <rect
                        key={si}
                        x={0}
                        y={y}
                        width={barW}
                        height={h}
                        rx={3}
                        fill={
                          isOn ? `url(#sb-${uid}-${si % seriesLabels.length})` : `url(#sb-idle-${uid})`
                        }
                      />
                    );
                  })}
                </svg>
                <span className="mt-2 text-2xs text-ink-muted">{day.label}</span>
                <span className="sr-only">{total}</span>
              </div>
            );
          })}
        </div>
        {tip ? (
          <div
            className="pointer-events-none fixed z-50 min-w-[140px] rounded-sm border border-line bg-surface p-3 shadow-pop"
            style={{ left: tip.x + 12, top: tip.y - 8 }}
          >
            <div className="text-xs font-semibold text-ink">{tip.day.label}</div>
            {seriesLabels.map((lab, si) => (
              <div key={lab} className="mt-1 flex justify-between gap-4 text-2xs">
                <span className="text-ink-muted">{lab}</span>
                <span className="tabular font-medium text-ink">
                  {tip.day.values[si] ?? 0}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
