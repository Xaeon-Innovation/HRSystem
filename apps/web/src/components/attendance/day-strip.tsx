"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import {
  addDaysIso,
  toIsoDate,
} from "@/components/attendance/format";

const STRIP_LEN = 7;

function monthLabel(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function weekdayShort(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.toLocaleDateString(undefined, { weekday: "short" });
}

function dayNumber(day: string) {
  const parts = day.split("-");
  return String(Number(parts[2]));
}

export function AttendanceDayStrip({
  day,
  onChange,
}: {
  day: string;
  counts?: Record<string, number>;
  onChange: (day: string) => void;
}) {
  const today = toIsoDate(new Date());
  const start = addDaysIso(day, -Math.floor(STRIP_LEN / 2));
  const days = Array.from({ length: STRIP_LEN }, (_, i) =>
    addDaysIso(start, i),
  );

  function shiftMonth(delta: number) {
    const [y, m, d] = day.split("-").map(Number);
    const next = new Date(y!, m! - 1 + delta, Math.min(d!, 28));
    onChange(toIsoDate(next));
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {days.map((d) => {
          const active = d === day;
          return (
            <button
              key={d}
              type="button"
              onClick={() => onChange(d)}
              aria-current={active ? "date" : undefined}
              aria-label={d}
              className={cn(
                "flex h-[54px] min-w-[54px] shrink-0 flex-col items-center justify-center rounded-[12px] border px-2 transition-colors",
                active
                  ? "border-ink bg-ink text-primary-foreground"
                  : "border-line bg-surface text-ink-2 hover:bg-surface-2",
                d === today && !active && "border-line-strong",
              )}
            >
              <span
                className={cn(
                  "text-[10.5px] font-medium leading-none",
                  active ? "text-primary-foreground/70" : "text-ink-muted",
                )}
              >
                {weekdayShort(d)}
              </span>
              <span className="mt-1 text-base font-semibold leading-none tabular">
                {dayNumber(d)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="inline-flex h-7 items-center rounded-[8px] border border-line bg-surface px-2.5 text-[11.5px] font-semibold text-ink">
          {monthLabel(day)}
        </span>
        <button
          type="button"
          className="inline-grid h-8 w-8 place-items-center rounded-[8px] border border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
          aria-label={t("Previous month")}
          onClick={() => shiftMonth(-1)}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <button
          type="button"
          className="inline-grid h-8 w-8 place-items-center rounded-[8px] border border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
          aria-label={t("Next month")}
          onClick={() => shiftMonth(1)}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
