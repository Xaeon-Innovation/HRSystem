"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDays } from "@/lib/leave/format";
import type { LeaveReportSummary } from "@/lib/leave/types";

export function LeaveReportsPanel({ summary }: { summary: LeaveReportSummary }) {
  const stats = [
    { label: "Pending requests", value: String(summary.pendingCount) },
    { label: "Approved this month", value: String(summary.approvedThisMonth) },
    { label: "Rejected this month", value: String(summary.rejectedThisMonth) },
    { label: "Currently off", value: String(summary.currentlyOff) },
    { label: "Upcoming absences", value: String(summary.upcomingAbsences) },
    {
      label: "Avg. approval time",
      value: summary.avgApprovalHours == null ? "—" : `${summary.avgApprovalHours}h`,
    },
    { label: "Most-used type", value: summary.mostUsedLeaveType ?? "—" },
    { label: "Unused leave total", value: formatDays(summary.unusedLeaveTotal) },
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
          <CardTitle className="text-base">Leave by department</CardTitle>
        </CardHeader>
        <CardContent>
          {summary.departmentUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approved leave to chart yet.</p>
          ) : (
            <ul className="space-y-3">
              {summary.departmentUsage.map((d) => {
                const max = summary.departmentUsage[0]?.days || 1;
                return (
                  <li key={d.department}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{d.department}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {formatDays(d.days)} · {d.people} people
                      </span>
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
