import * as React from "react";
import { cn } from "@/lib/utils";

export type TimelineTone = "accent" | "warn" | "danger";

const ringClass: Record<TimelineTone, string> = {
  accent: "border-accent bg-accent/20",
  warn: "border-warn bg-warn/20",
  danger: "border-danger bg-danger/20",
};

export type TimelineItem = {
  id: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  tone?: TimelineTone;
};

export type TimelineProps = {
  items: TimelineItem[];
  className?: string;
};

export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn("relative space-y-4 ps-1", className)}>
      {items.map((item, i) => (
        <li key={item.id} className="relative flex gap-3 ps-5">
          {i < items.length - 1 ? (
            <span
              className="absolute start-[7px] top-4 bottom-[-8px] w-px bg-line"
              aria-hidden
            />
          ) : null}
          <span
            className={cn(
              "absolute start-0 top-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 bg-surface",
              ringClass[item.tone ?? "accent"],
            )}
            aria-hidden
          />
          <div className="min-w-0 flex-1 pb-1">
            <div className="text-sm font-medium text-ink">{item.title}</div>
            {item.meta ? (
              <div className="mt-0.5 text-xs text-ink-muted">{item.meta}</div>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
