"use client";

import { cn } from "@/lib/utils";

export type DayStripItem = {
  key: string;
  label: string;
  sub?: string;
};

export type DayStripProps = {
  days: DayStripItem[];
  activeKey: string;
  onChange: (key: string) => void;
  className?: string;
};

export function DayStrip({ days, activeKey, onChange, className }: DayStripProps) {
  return (
    <div
      className={cn(
        "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {days.map((d) => {
        const active = d.key === activeKey;
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => onChange(d.key)}
            className={cn(
              "flex h-[54px] min-w-[54px] shrink-0 flex-col items-center justify-center rounded-sm border px-2 transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-line bg-surface text-ink-2 hover:bg-surface-2",
            )}
          >
            <span className="text-xs font-semibold">{d.label}</span>
            {d.sub ? (
              <span
                className={cn(
                  "text-[10px]",
                  active ? "text-primary-foreground/80" : "text-ink-muted",
                )}
              >
                {d.sub}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
