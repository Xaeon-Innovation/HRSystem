"use client";

import { ChevronRight } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/kpis/format";
import type { PersonPulse } from "@/lib/kpis/people";
import { t } from "@/i18n";

const STATUS_COPY: Record<PersonPulse["status"], string> = {
  need_look: "Needs a look",
  incomplete: "Missing results",
  on_track: "On track",
};

export function KpiPeopleQueue({
  people,
  selectedId,
  onSelect,
}: {
  people: PersonPulse[];
  selectedId?: string | null;
  onSelect: (employeeId: string) => void;
}) {
  if (people.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
        {t("No one matches this pulse filter.")}</p>
    );
  }

  return (
    <ul className="divide-y overflow-hidden rounded-xl border bg-card">
      {people.map((person) => (
        <li key={person.employeeId}>
          <button
            type="button"
            onClick={() => onSelect(person.employeeId)}
            className={cn(
              "flex w-full min-w-0 items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50 sm:px-4",
              selectedId === person.employeeId && "bg-primary/5",
            )}
          >
            <UserAvatar
              name={person.name}
              avatarUrl={person.avatarUrl}
              className="h-10 w-10 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <p className="truncate text-sm font-medium">{person.name}</p>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    person.status === "need_look" &&
                      "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
                    person.status === "incomplete" &&
                      "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
                    person.status === "on_track" &&
                      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
                  )}
                >
                  {t(STATUS_COPY[person.status])}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {person.jobTitle || "-"} · {person.metricCount} {t("metric")}{person.metricCount === 1 ? "" : "s"}
                {person.waitingAckCount > 0
                  ? ` · ${person.waitingAckCount} waiting ack`
                  : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-lg font-semibold tabular-nums">
                {person.overall == null ? "-" : formatNumber(person.overall, 0)}
              </p>
              <p className="text-[10px] text-muted-foreground">{t("overall")}</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
    </ul>
  );
}
