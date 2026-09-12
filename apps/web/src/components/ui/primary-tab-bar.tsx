"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type TabOption = {
  value: string;
  label: string;
  badge?: number;
};

/** Primary tabs + More menu — keeps existing TabsContent wiring via controlled value. */
export function PrimaryTabBar({
  tabs,
  value,
  onValueChange,
  primaryCount = 3,
  className,
}: {
  tabs: TabOption[];
  value: string;
  onValueChange: (value: string) => void;
  primaryCount?: number;
  className?: string;
}) {
  const primary = tabs.slice(0, primaryCount);
  const more = tabs.slice(primaryCount);
  const inMore = more.some((t) => t.value === value);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!inMore) setOpen(false);
  }, [inMore, value]);

  const moreLabel = more.find((t) => t.value === value)?.label ?? "More";
  const moreBadge = more.reduce((sum, t) => sum + (t.badge ?? 0), 0);

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex flex-wrap gap-1 rounded-lg bg-secondary/70 p-1 backdrop-blur-md">
        {primary.map((t) => {
          const active = value === t.value;
          return (
            <button
              key={t.value}
              type="button"
              onClick={() => {
                onValueChange(t.value);
                setOpen(false);
              }}
              className={cn(
                "inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {t.badge != null && t.badge > 0 ? (
                <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                  {t.badge > 99 ? "99+" : t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {more.length > 0 ? (
        <div className="relative w-full sm:w-auto">
          <button
            type="button"
            className={cn(
              "inline-flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-card px-3 text-sm sm:min-w-[9rem] sm:w-auto",
              inMore ? "border-primary/40 text-foreground" : "text-muted-foreground",
            )}
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
          >
            <span className="inline-flex items-center gap-1.5">
              <span>{moreLabel}</span>
              {moreBadge > 0 ? (
                <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold text-primary">
                  {moreBadge > 99 ? "99+" : moreBadge}
                </span>
              ) : null}
            </span>
            <span className="text-xs">▾</span>
          </button>
          {open ? (
            <div className="absolute left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-md border bg-card p-1 shadow-md sm:left-auto sm:right-0 sm:w-52">
              {more.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-secondary",
                    value === t.value && "bg-accent text-accent-foreground",
                  )}
                  onClick={() => {
                    onValueChange(t.value);
                    setOpen(false);
                  }}
                >
                  {t.label}
                  {t.badge != null && t.badge > 0 ? (
                    <span className="text-[10px] font-semibold tabular-nums">
                      {t.badge}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
