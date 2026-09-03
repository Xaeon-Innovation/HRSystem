import { cn } from "@/lib/utils";
import {
  bandPositionLabel,
  changeStatusLabel,
  compStatusLabel,
  variableStatusLabel,
} from "@/lib/compensation/format";
import type {
  BandPosition,
  ChangeRequestStatus,
  CompStatus,
  VariableStatus,
} from "@/lib/compensation/types";

const COMP_STATUS: Record<CompStatus, string> = {
  active:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  pending_change:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  frozen:
    "bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  inactive:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-700",
};

const CHANGE_STATUS: Record<ChangeRequestStatus, string> = {
  draft:
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
  pending:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  approved:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  rejected:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
  returned:
    "bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
};

const VARIABLE_STATUS: Record<VariableStatus, string> = {
  draft:
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
  pending:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  approved:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  paid:
    "bg-teal-50 text-teal-800 ring-1 ring-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-800",
  rejected:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
};

const BAND_STATUS: Record<BandPosition, string> = {
  below:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  in_band:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  above:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
};

const pill =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

export function CompStatusBadge({ status }: { status: CompStatus }) {
  return <span className={cn(pill, COMP_STATUS[status])}>{compStatusLabel(status)}</span>;
}

export function ChangeStatusBadge({ status }: { status: ChangeRequestStatus }) {
  return <span className={cn(pill, CHANGE_STATUS[status])}>{changeStatusLabel(status)}</span>;
}

export function VariableStatusBadge({ status }: { status: VariableStatus }) {
  return <span className={cn(pill, VARIABLE_STATUS[status])}>{variableStatusLabel(status)}</span>;
}

export function BandBadge({ position }: { position: BandPosition | null }) {
  if (!position) return <span className="text-xs text-muted-foreground">No band</span>;
  return <span className={cn(pill, BAND_STATUS[position])}>{bandPositionLabel(position)}</span>;
}
