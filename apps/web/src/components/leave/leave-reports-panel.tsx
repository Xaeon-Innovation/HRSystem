"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDays } from "@/lib/leave/format";
import type { LeaveReportSummary } from "@/lib/leave/types";
import { t } from "@/i18n";

export function LeaveReportsPanel({ summary }: { summary: LeaveReportSummary }) {
  const stats = [
    { label: t("Pending requests"), value: String(summary.pendingCount) },
    { label: t("Approved this month"), value: String(summary.approvedThisMonth) },
    { label: t("Rejected this month"), value: String(summary.rejectedThisMonth) },
    { label: t("Currently off"), value: String(summary.currentlyOff) },
    { label: t("Upcoming absences"), value: String(summary.upcomingAbsences) },
    {
      label: t("Avg. approval time"),
      value: summary.avgApprovalHours == null ? "—" : `${summary.avgApprovalHours}h`,
    },
    { label: t("Most-used type"), value: summary.mostUsedLeaveType ?? "—" },
    { label: t("Unused leave total"), value: formatDays(summary.unusedLeaveTotal) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("Leave by department")}</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.departmentUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("No approved leave to chart yet.")}</p>
          ) : (
            <ul className="space-y-3">
              {summary.departmentUsage.map((d) => {
                const max = summary.departmentUsage[0]?.days || 1;
                return (
                  <li key={d.department}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{d.department}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatDays(d.days)} · {d.people} {t("people")}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(8, (d.days / max) * 100)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
