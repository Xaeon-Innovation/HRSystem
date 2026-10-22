"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { formatMinutesAsHours } from "@/components/attendance/format";
import { t } from "@/i18n";

const selectClass =
  "h-10 w-full rounded-sm border border-line bg-surface px-3 text-sm text-ink";

type EmployeeOpt = { id: string; name: string };

type Snapshot = {
  attendance?: {
    daysWorked?: number;
    totalWorkMinutes?: number;
    latenessMinutes?: number;
  };
  hours?: {
    shiftMinutes?: number;
    overtimeMinutes?: number;
  };
  kpi?: {
    overallScore?: number | null;
  };
};

type PerformanceReport = {
  id: string;
  employeeId: string;
  cadence: "daily" | "weekly" | "monthly";
  periodStart: string;
  periodEnd: string;
  snapshot: Snapshot;
  feedback: string | null;
  generatedAt: string;
};

function cadenceLabel(c: PerformanceReport["cadence"]) {
  if (c === "daily") return t("Daily");
  if (c === "weekly") return t("Weekly");
  return t("Monthly");
}

export function PerformanceReportsPanel({
  employees,
  isAdmin,
}: {
  employees: EmployeeOpt[];
  isAdmin: boolean;
}) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [cadence, setCadence] = useState<"" | "daily" | "weekly" | "monthly">(
    "",
  );
  const [reports, setReports] = useState<PerformanceReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pendingClear, setPendingClear] = useState<PerformanceReport | null>(
    null,
  );

  const load = useCallback(async () => {
    if (!employeeId) {
      setReports([]);
      return;
    }
    setError(null);
    const qs = new URLSearchParams({ employeeId });
    if (cadence) qs.set("cadence", cadence);
    const data = await api<{ reports: PerformanceReport[] }>(
      `/v1/employee-hr/performance-reports?${qs.toString()}`,
    );
    const list = data.reports ?? [];
    setReports(list);
    setDrafts(
      Object.fromEntries(list.map((r) => [r.id, r.feedback ?? ""])),
    );
  }, [employeeId, cadence]);

  useEffect(() => {
    if (!employeeId && employees[0]) setEmployeeId(employees[0].id);
  }, [employees, employeeId]);

  useEffect(() => {
    setReports(null);
    void load().catch((e) => {
      setError(e instanceof Error ? e.message : t("Failed"));
      setReports([]);
    });
  }, [load]);

  async function saveFeedback(report: PerformanceReport, feedback: string | null) {
    setBusyId(report.id);
    setError(null);
    try {
      await api(`/v1/employee-hr/performance-reports/${report.id}/feedback`, {
        method: "PATCH",
        body: JSON.stringify({ feedback }),
      });
      setPendingClear(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Failed"));
    } finally {
      setBusyId(null);
    }
  }

  function onSaveClick(report: PerformanceReport) {
    const next = (drafts[report.id] ?? "").trim();
    const prev = (report.feedback ?? "").trim();
    if (prev && !next) {
      setPendingClear(report);
      return;
    }
    void saveFeedback(report, next || null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 space-y-1 sm:max-w-xs">
          <Label>{t("Employee")}</Label>
          <select
            className={selectClass}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            {employees.length === 0 ? (
              <option value="">{t("No employees")}</option>
            ) : null}
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 sm:w-40">
          <Label>{t("Cadence")}</Label>
          <select
            className={selectClass}
            value={cadence}
            onChange={(e) =>
              setCadence(
                e.target.value as "" | "daily" | "weekly" | "monthly",
              )
            }
          >
            <option value="">{t("All")}</option>
            <option value="daily">{t("Daily")}</option>
            <option value="weekly">{t("Weekly")}</option>
            <option value="monthly">{t("Monthly")}</option>
          </select>
        </div>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {reports === null ? (
        <PageSkeleton dense />
      ) : reports.length === 0 ? (
        <Card className="border-line bg-surface">
          <CardContent className="py-8 text-sm text-ink-muted">
            {t("No performance reports for this selection.")}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reports.map((report) => {
            const snap = report.snapshot ?? {};
            const hours =
              snap.hours?.shiftMinutes != null
                ? formatMinutesAsHours(snap.hours.shiftMinutes)
                : snap.attendance?.totalWorkMinutes != null
                  ? formatMinutesAsHours(snap.attendance.totalWorkMinutes)
                  : "—";
            const ot =
              snap.hours?.overtimeMinutes != null
                ? formatMinutesAsHours(snap.hours.overtimeMinutes)
                : null;
            const days = snap.attendance?.daysWorked;
            const kpiScore = snap.kpi?.overallScore;
            return (
              <li key={report.id}>
                <Card className="border-line bg-surface">
                  <CardContent className="space-y-3 py-4">
                    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">
                          {report.periodStart}
                          {report.periodEnd !== report.periodStart
                            ? ` → ${report.periodEnd}`
                            : ""}
                        </p>
                        <p className="text-xs text-ink-muted">
                          {cadenceLabel(report.cadence)}
                        </p>
                      </div>
                    </div>
                    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-xs text-ink-muted">
                          {t("Hours")}
                        </dt>
                        <dd className="font-medium tabular-nums">{hours}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-muted">
                          {t("Overtime")}
                        </dt>
                        <dd className="font-medium tabular-nums">
                          {ot ?? "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-muted">
                          {t("Attendance")}
                        </dt>
                        <dd className="font-medium tabular-nums">
                          {days != null
                            ? `${days} ${t("days worked")}`
                            : "—"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-muted">
                          {t("KPI score")}
                        </dt>
                        <dd className="font-medium tabular-nums">
                          {kpiScore != null ? kpiScore.toFixed(1) : "—"}
                        </dd>
                      </div>
                    </dl>
                    {isAdmin ? (
                      <div className="space-y-2">
                        <Label className="text-xs">{t("Feedback")}</Label>
                        <textarea
                          className="min-h-20 w-full rounded-sm border border-line bg-surface p-3 text-sm text-ink"
                          value={drafts[report.id] ?? ""}
                          onChange={(e) =>
                            setDrafts((prev) => ({
                              ...prev,
                              [report.id]: e.target.value,
                            }))
                          }
                          placeholder={t("Manager feedback")}
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="w-full sm:w-auto"
                          disabled={busyId === report.id}
                          onClick={() => onSaveClick(report)}
                        >
                          {busyId === report.id
                            ? t("Saving…")
                            : t("Save feedback")}
                        </Button>
                      </div>
                    ) : report.feedback ? (
                      <div className="rounded-sm bg-surface-2 px-3 py-2 text-sm">
                        <p className="text-xs text-ink-muted">
                          {t("Feedback")}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-ink">
                          {report.feedback}
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(pendingClear)}
        title="Clear feedback?"
        description="This replaces the existing feedback with an empty note."
        confirmLabel="Clear feedback"
        variant="destructive"
        busy={Boolean(pendingClear && busyId === pendingClear.id)}
        onConfirm={() => {
          if (pendingClear) void saveFeedback(pendingClear, null);
        }}
        onOpenChange={(open) => {
          if (!open && !busyId) setPendingClear(null);
        }}
      />
    </div>
  );
}
