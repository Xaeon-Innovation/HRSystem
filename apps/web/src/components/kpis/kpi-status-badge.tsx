import { cn } from "@/lib/utils";
import { statusLabel, trendLabel } from "@/lib/kpis/format";
import type { KpiStatus, KpiTrend } from "@/lib/kpis/types";

const STATUS_CLASS: Record<KpiStatus, string> = {
  exceeded:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  on_track: "bg-teal-50 text-teal-800 ring-1 ring-teal-200",
  at_risk: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  below_target: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
  missing: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
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
  up: "text-emerald-700",
  down: "text-rose-700",
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
