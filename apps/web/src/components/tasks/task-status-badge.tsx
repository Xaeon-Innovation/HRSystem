import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";
import {
  TASK_PRIORITY_LABEL,
  TASK_STATUS_LABEL,
  type TaskPriority,
  type TaskStatus,
} from "@/components/tasks/types";

const PILL =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

const STATUS_CLASS: Record<TaskStatus, string> = {
  open: "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
  in_progress:
    "bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  submitted:
    "bg-violet-50 text-violet-900 ring-1 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800",
  changes_requested:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  completed:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  cancelled:
    "bg-stone-100 text-stone-600 ring-1 ring-stone-200 dark:bg-stone-800/80 dark:text-stone-400 dark:ring-stone-700",
};

const PRIORITY_FLAG: Record<TaskPriority, string> = {
  low: "text-slate-400 dark:text-slate-500",
  medium: "text-sky-500 dark:text-sky-400",
  high: "text-amber-500 dark:text-amber-400",
  urgent: "text-rose-600 dark:text-rose-400",
};

const PRIORITY_PILL: Record<TaskPriority, string> = {
  low: "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-700",
  medium:
    "bg-sky-50 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  high: "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  urgent:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
};

export function TaskStatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span className={cn(PILL, STATUS_CLASS[status], className)}>
      {t(TASK_STATUS_LABEL[status])}
    </span>
  );
}

export function TaskPriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <span className={cn(PILL, "gap-1", PRIORITY_PILL[priority], className)}>
      <Flag
        className={cn("h-3 w-3 fill-current", PRIORITY_FLAG[priority])}
        aria-hidden
      />
      {t(TASK_PRIORITY_LABEL[priority])}
    </span>
  );
}
