"use client";

import { Users } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { Card } from "@/components/ui/card";
import { Chip, EmptyState, HatchBar } from "@/components/elevora";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/kpis/format";
import type { PersonPulse } from "@/lib/kpis/people";
import { t } from "@/i18n";
import { KpiOnTrackChip } from "@/components/kpis/kpi-status-badge";

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
      <Card className="overflow-hidden border-line bg-surface p-0">
        <EmptyState
          icon={<Users className="h-5 w-5" />}
          title={t("No one matches this pulse filter.")}
        />
      </Card>
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(280px,1fr))]">
      {people.map((person) => {
        const score = person.overall;
        const hatchTone =
          score == null ? "idle" : score < 75 ? "warn" : "accent";
        return (
          <li key={person.employeeId} className="min-w-0">
            <button
              type="button"
              onClick={() => onSelect(person.employeeId)}
              className={cn(
                "flex h-full w-full min-w-0 flex-col gap-3 rounded-sm border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong",
                selectedId === person.employeeId && "border-accent/40 bg-accent-tint",
              )}
            >
              <div className="flex items-start gap-3">
                <UserAvatar
                  name={person.name}
                  avatarUrl={person.avatarUrl}
                  className="h-10 w-10 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {person.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-ink-muted">
                    {person.jobTitle || "-"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-lg font-semibold tabular-nums text-ink">
                    {score == null ? "-" : formatNumber(score, 0)}
                  </p>
                  <p className="text-[10px] text-ink-muted">{t("overall")}</p>
                </div>
              </div>

              <HatchBar
                percent={score == null ? 0 : Math.min(100, Math.max(0, score))}
                tone={hatchTone}
                size="xs"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-ink-muted">
                  {person.metricCount} {t("local KPIs")}
                  {person.waitingAckCount > 0
                    ? ` · ${person.waitingAckCount} ${t("waiting ack")}`
                    : ""}
                </p>
                {person.status === "on_track" ? (
                  <KpiOnTrackChip onTrack />
                ) : (
                  <Chip
                    tone={
                      person.status === "need_look" ? "danger" : "warn"
                    }
                  >
                    {t(STATUS_COPY[person.status])}
                  </Chip>
                )}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
