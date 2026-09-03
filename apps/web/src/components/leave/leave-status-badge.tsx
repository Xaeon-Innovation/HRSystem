import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/leave/format";
import type { LeaveRequestStatus } from "@/lib/leave/types";

const STATUS_CLASS: Record<LeaveRequestStatus, string> = {
  draft:
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
  pending:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  approved:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  rejected:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
  cancelled:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-700",
  returned:
    "bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  expired:
    "bg-stone-100 text-stone-600 ring-1 ring-stone-200 dark:bg-stone-800/80 dark:text-stone-300 dark:ring-stone-700",
};

export function LeaveStatusBadge({ status }: { status: LeaveRequestStatus }) {
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
