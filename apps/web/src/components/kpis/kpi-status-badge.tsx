import { cn } from "@/lib/utils";
import { statusLabel, trendLabel } from "@/lib/kpis/format";
import type { KpiStatus, KpiTrend } from "@/lib/kpis/types";

const STATUS_CLASS: Record<KpiStatus, string> = {
  exceeded:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  on_track:
    "bg-teal-50 text-teal-800 ring-1 ring-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-800",
  at_risk:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  below_target:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
  missing:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
};

export function KpiStatusBadge({ status }: { status: KpiStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_CLASS[status],
      )}
    >
      {statusLabel(status)}
    </span>
  );
}

const TREND_CLASS: Record<KpiTrend, string> = {
  up: "text-emerald-700 dark:text-emerald-400",
  down: "text-rose-700 dark:text-rose-400",
  flat: "text-muted-foreground",
  new: "text-muted-foreground",
};

export function KpiTrendBadge({ trend }: { trend: KpiTrend }) {
  return (
    <span className={cn("text-xs font-medium", TREND_CLASS[trend])}>
      {trendLabel(trend)}
    </span>
  );
}
