"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import { toIsoDate } from "@/components/attendance/format";

export type MonthWeek = {
  week: number;
  from: string;
  to: string;
};

/** Calendar weeks of a month: 1–7, 8–14, 15–21, 22–end (always 4). */
export function monthWeeks(monthStart: string): MonthWeek[] {
  const [y, m] = monthStart.split("-").map(Number);
  const lastDay = new Date(y!, m!, 0).getDate();
  return [1, 2, 3, 4].map((week) => {
    const startDay = (week - 1) * 7 + 1;
    const endDay = week === 4 ? lastDay : Math.min(week * 7, lastDay);
    const from = toIsoDate(new Date(y!, m! - 1, startDay));
    const to = toIsoDate(new Date(y!, m! - 1, endDay));
    return { week, from, to };
  });
}

export function weekOfMonth(day: string): number {
  const d = Number(day.split("-")[2]);
  return Math.min(4, Math.ceil(d / 7));
}

function monthLabel(monthStart: string) {
  const [y, m] = monthStart.split("-").map(Number);
  const dt = new Date(y!, m! - 1, 1);
  return dt.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

function shiftMonthStart(monthStart: string, delta: number) {
  const [y, m] = monthStart.split("-").map(Number);
  return toIsoDate(new Date(y!, m! - 1 + delta, 1));
}

export function HoursWeekStrip({
  monthStart,
  week,
  onMonthChange,
  onWeekChange,
}: {
  monthStart: string;
  week: number;
  onMonthChange: (monthStart: string) => void;
  onWeekChange: (week: number) => void;
}) {
  const weeks = monthWeeks(monthStart);
  const now = new Date();
  const thisMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const todayWeek =
    monthStart === thisMonthStart ? weekOfMonth(toIsoDate(now)) : null;

  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {weeks.map((w) => {
          const active = w.week === week;
          return (
            <button
              key={w.week}
              type="button"
              onClick={() => onWeekChange(w.week)}
              aria-current={active ? "true" : undefined}
              aria-label={t("Week {n}", { n: w.week })}
              className={cn(
                "flex h-[54px] min-w-[64px] shrink-0 flex-col items-center justify-center rounded-[12px] border px-2.5 transition-colors",
                active
                  ? "border-ink bg-ink text-primary-foreground"
                  : "border-line bg-surface text-ink-2 hover:bg-surface-2",
                todayWeek === w.week && !active && "border-line-strong",
              )}
            >
              <span
                className={cn(
                  "text-[10.5px] font-medium leading-none",
                  active ? "text-primary-foreground/70" : "text-ink-muted",
                )}
              >
                {t("Week")}
              </span>
              <span className="mt-1 text-base font-semibold leading-none tabular">
                {w.week}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <span className="inline-flex h-7 items-center rounded-[8px] border border-line bg-surface px-2.5 text-[11.5px] font-semibold text-ink">
          {monthLabel(monthStart)}
        </span>
        <button
          type="button"
          className="inline-grid h-8 w-8 place-items-center rounded-[8px] border border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
          aria-label={t("Previous month")}
          onClick={() => onMonthChange(shiftMonthStart(monthStart, -1))}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </button>
        <button
          type="button"
          className="inline-grid h-8 w-8 place-items-center rounded-[8px] border border-line bg-surface text-ink-2 hover:bg-surface-2 hover:text-ink"
          aria-label={t("Next month")}
          onClick={() => onMonthChange(shiftMonthStart(monthStart, 1))}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  );
}
