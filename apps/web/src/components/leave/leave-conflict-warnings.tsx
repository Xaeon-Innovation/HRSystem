import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LeaveConflict } from "@/lib/leave/types";

export function LeaveConflictWarnings({
  conflicts,
}: {
  conflicts: LeaveConflict[];
}) {
  if (conflicts.length === 0) return null;
  return (
    <ul className="space-y-2" role="alert">
      {conflicts.map((c) => (
        <li
          key={c.kind + c.message}
          className={cn(
            "flex gap-2 rounded-lg px-3 py-2 text-sm",
            c.severity === "error" &&
              "border border-rose-200 bg-rose-50 text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200",
            c.severity === "warning" &&
              "border border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
            c.severity === "info" &&
              "border border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/60 dark:text-sky-200",
          )}
        >
          {c.severity === "info" ? (
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span>{c.message}</span>
        </li>
      ))}
    </ul>
  );
}
