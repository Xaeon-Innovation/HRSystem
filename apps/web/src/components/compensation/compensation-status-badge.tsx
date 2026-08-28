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
  active: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  pending_change: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  frozen: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
  inactive: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
};

const CHANGE_STATUS: Record<ChangeRequestStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  pending: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
  returned: "bg-sky-50 text-sky-900 ring-1 ring-sky-200",
};

const VARIABLE_STATUS: Record<VariableStatus, string> = {
  draft: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
  pending: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  paid: "bg-teal-50 text-teal-800 ring-1 ring-teal-200",
  rejected: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
};

const BAND_STATUS: Record<BandPosition, string> = {
  below: "bg-amber-50 text-amber-900 ring-1 ring-amber-200",
  in_band: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  above: "bg-rose-50 text-rose-800 ring-1 ring-rose-200",
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
