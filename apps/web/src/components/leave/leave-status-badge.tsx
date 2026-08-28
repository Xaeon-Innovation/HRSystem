import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/leave/format";
import type { LeaveRequestStatus } from "@/lib/leave/types";

const STATUS_CLASS: Record<LeaveRequestStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  pending: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
  cancelled: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  returned: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
  expired: "bg-stone-100 text-stone-600 ring-1 ring-stone-200",
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
