"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

type TeamStatus = "clocked_in" | "clocked_out" | "on_leave" | "unknown";

type TeamMember = {
  id: string;
  name: string;
  status: TeamStatus;
  clockInAt?: string | null;
  late?: boolean;
  missedClockOut?: boolean;
};

const STATUS_LABEL: Record<TeamStatus, string> = {
  clocked_in: t("Clocked in"),
  clocked_out: t("Clocked out"),
  on_leave: t("On leave"),
  unknown: "Unknown",
};

const STATUS_CLASS: Record<TeamStatus, string> = {
  clocked_in: "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  clocked_out: "bg-muted text-muted-foreground",
  on_leave: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
  unknown: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
};

function formatClockIn(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export default function TeamTodayPage() {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api<{ team: TeamMember[]; day: string }>("/v1/admin/team-today")
      .then((res) => {
        if (cancelled) return;
        setTeam(res.team ?? []);
        setDay(res.day ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load team");
        setTeam([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (team === null) {
    return <PageSkeleton dense />;
  }

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Team today")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Who is in, out, late, or on leave")}{day ? ` · ${day}` : ""}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {team.length === 0 && !error ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            {t("No direct reports to show for today.")}</CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {team.map((m) => {
            const time = formatClockIn(m.clockInAt);
            return (
              <li key={m.id}>
                <Card>
                  <CardContent className="flex min-w-0 flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        {time ? <span>{t("In")} {time}</span> : null}
                        {m.late ? (
                          <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 font-medium text-amber-900 dark:text-amber-200">
                            {t("Late")}</span>
                        ) : null}
                        {m.missedClockOut ? (
                          <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 font-medium text-destructive">
                            {t("Missed clock-out")}</span>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "inline-flex w-fit shrink-0 rounded-md px-2 py-1 text-xs font-medium",
                        STATUS_CLASS[m.status],
                      )}
                    >
                      {STATUS_LABEL[m.status]}
                    </span>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
