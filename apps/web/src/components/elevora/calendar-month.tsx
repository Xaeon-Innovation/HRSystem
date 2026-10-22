import * as React from "react";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  label: string;
  tone?: "accent" | "warn" | "idle" | "yellow" | "soft";
};

export type CalendarMonthProps = {
  weekdayLabels?: string[];
  days: {
    date: number;
    isToday?: boolean;
    isOutside?: boolean;
    events?: CalendarEvent[];
  }[];
  className?: string;
};

const eventClass = {
  accent: "hatch",
  warn: "hatch-warn",
  idle: "hatch-idle",
  yellow: "hatch-yellow",
  soft: "hatch-soft",
} as const;

export function CalendarMonth({
  weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  days,
  className,
}: CalendarMonthProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-2xs font-medium text-ink-muted">
        {weekdayLabels.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <div
            key={i}
            className={cn(
              "flex min-h-[72px] flex-col rounded-[12px] bg-surface-2 p-2",
              day.isToday && "ring-1 ring-ink ring-offset-1 ring-offset-frame",
              day.isOutside && "opacity-50",
            )}
          >
            <span className="text-xs font-medium tabular text-ink">{day.date}</span>
            <div className="mt-1 flex flex-col gap-0.5">
              {day.events?.slice(0, 2).map((ev) => (
                <span
                  key={ev.id}
                  className={cn(
                    "truncate rounded-[3px] px-1 py-0.5 text-[10px] text-accent-ink",
                    eventClass[ev.tone ?? "accent"],
                  )}
                >
                  {ev.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
