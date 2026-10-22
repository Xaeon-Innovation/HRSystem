"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BarChart3, Users } from "lucide-react";
import { api } from "@/lib/api";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  EmptyState,
  Notice,
  PageHeader,
  PersonCell,
  Segmented,
  StatBlock,
  StatusText,
} from "@/components/elevora";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHead,
  DataTableHeaderCell,
  DataTableRow,
  DataTableWrap,
} from "@/components/ui/table";
import { t } from "@/i18n";

type PresenceFilter = "all" | "clocked_in" | "late" | "clocked_out" | "on_leave";

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

function statusForRow(m: TeamMember): string {
  if (m.missedClockOut) return t("Missed clock-out");
  if (m.late) return t("Late");
  return STATUS_LABEL[m.status];
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

  const [filter, setFilter] = useState<PresenceFilter>("all");

  const groups = useMemo(() => {
    const list = team ?? [];
    return {
      clocked_in: list.filter((m) => m.status === "clocked_in"),
      late: list.filter((m) => m.late),
      clocked_out: list.filter((m) => m.status === "clocked_out"),
      on_leave: list.filter((m) => m.status === "on_leave"),
    };
  }, [team]);

  const visible = useMemo(() => {
    const list = team ?? [];
    return filter === "all" ? list : groups[filter];
  }, [team, groups, filter]);

  if (team === null) {
    return <PageSkeleton dense />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Team today")}
        subtitle={
          day
            ? `${t("Who is in, out, late, or on leave")} · ${day}`
            : t("Who is in, out, late, or on leave")
        }
        actions={
          team.length > 0 ? (
            <div className="max-w-full overflow-x-auto">
              <Segmented<PresenceFilter>
                aria-label={t("Status")}
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: t("All") },
                  { value: "clocked_in", label: t("Clocked in") },
                  { value: "late", label: t("Late") },
                  { value: "clocked_out", label: t("Clocked out") },
                  { value: "on_leave", label: t("On leave") },
                ]}
                className="w-max"
              />
            </div>
          ) : null
        }
      />

      {error ? <Notice tone="warn">{error}</Notice> : null}

      {team.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {(
            [
              { key: "clocked_in", label: t("Clocked in") },
              { key: "late", label: t("Late") },
              { key: "clocked_out", label: t("Clocked out") },
              { key: "on_leave", label: t("On leave") },
            ] as const
          ).map((s) => {
            const members = groups[s.key];
            return (
              <div
                key={s.key}
                className="min-w-0 rounded-lg border border-line bg-surface p-4 shadow-sm"
              >
                <StatBlock label={s.label} value={String(members.length)} size="sm" />
                <div className="mt-3 flex h-8 items-center">
                  {members.length > 0 ? (
                    <div className="flex items-center -space-x-2 rtl:space-x-reverse">
                      {members.slice(0, 5).map((m) => (
                        <UserAvatar
                          key={m.id}
                          name={m.name}
                          size="sm"
                          className="ring-2 ring-surface"
                        />
                      ))}
                      {members.length > 5 ? (
                        <span className="relative inline-grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-[10px] font-semibold text-ink-2 ring-2 ring-surface">
                          +{members.length - 5}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="text-xs text-ink-muted">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {team.length === 0 && !error ? (
        <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={t("No direct reports to show for today.")}
            subtitle={t("When your team clocks in, they will appear here.")}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm">
          <DataTableWrap>
            <DataTable>
              <DataTableHead>
                <DataTableRow className="border-b border-line hover:bg-transparent">
                  <DataTableHeaderCell>{t("Employee")}</DataTableHeaderCell>
                  <DataTableHeaderCell>{t("Clock-in")}</DataTableHeaderCell>
                  <DataTableHeaderCell>{t("Status")}</DataTableHeaderCell>
                  <DataTableHeaderCell className="w-12">
                    <span className="sr-only">{t("Analytics")}</span>
                  </DataTableHeaderCell>
                </DataTableRow>
              </DataTableHead>
              <DataTableBody>
                {visible.length === 0 ? (
                  <DataTableRow className="hover:bg-transparent">
                    <DataTableCell colSpan={4} className="py-8 text-center text-ink-muted">
                      {t("No one matches this filter.")}
                    </DataTableCell>
                  </DataTableRow>
                ) : null}
                {visible.map((m) => {
                  const time = formatClockIn(m.clockInAt);
                  const subtitle = [
                    time ? `${t("In")} ${time}` : null,
                    m.late ? t("Late") : null,
                    m.missedClockOut ? t("Missed clock-out") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <DataTableRow key={m.id}>
                      <DataTableCell>
                        <PersonCell
                          name={m.name}
                          subtitle={subtitle || undefined}
                          avatar={
                            <UserAvatar name={m.name} size="sm" />
                          }
                        />
                      </DataTableCell>
                      <DataTableCell className="text-ink-muted">
                        {time ?? "—"}
                      </DataTableCell>
                      <DataTableCell>
                        <StatusText status={statusForRow(m)} />
                      </DataTableCell>
                      <DataTableCell>
                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                        >
                          <Link
                            href={`/app/analytics/employees/${m.id}`}
                            aria-label={t("Analytics")}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                        </Button>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          </DataTableWrap>
        </div>
      )}
    </div>
  );
}
