import {
  BadgeCheck,
  ClipboardList,
  Palmtree,
  Settings2,
  Sparkles,
  Timer,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import type { AlertCategory, AlertUrgency } from "@hr/shared";
import { ALERT_CATEGORY_META, ALERT_URGENCY_META } from "@hr/shared";

export const CATEGORY_ICON: Record<
  AlertCategory,
  typeof Users
> = {
  employee: Users,
  leave: Palmtree,
  kpi: ClipboardList,
  attendance: Timer,
  payroll: BadgeCheck,
  system: Settings2,
  custom: Sparkles,
};

export const CATEGORY_TONE: Record<AlertCategory, string> = {
  employee:
    "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  leave:
    "bg-emerald-50 text-emerald-800 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  kpi:
    "bg-violet-50 text-violet-800 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800",
  attendance:
    "bg-teal-50 text-teal-800 ring-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-800",
  payroll:
    "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  system:
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
  custom:
    "bg-fuchsia-50 text-fuchsia-800 ring-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:ring-fuchsia-800",
};

export const URGENCY_TONE: Record<AlertUrgency, string> = {
  info: "bg-sky-50 text-sky-800 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  warning:
    "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  critical:
    "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
};

export const URGENCY_BAR: Record<AlertUrgency, string> = {
  info: "bg-sky-400",
  warning: "bg-amber-400",
  critical: "bg-rose-500",
};

export function CategoryBadge({ category }: { category: AlertCategory }) {
  const Icon = CATEGORY_ICON[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
        CATEGORY_TONE[category],
      )}
    >
      <Icon className="h-3 w-3" />
      {t(ALERT_CATEGORY_META[category].label)}
    </span>
  );
}

export function UrgencyBadge({ urgency }: { urgency: AlertUrgency }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1",
        URGENCY_TONE[urgency],
      )}
    >
      {t(ALERT_URGENCY_META[urgency].label)}
    </span>
  );
}
