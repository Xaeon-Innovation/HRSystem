"use client";

import { useMemo } from "react";
import {
  HatchBar,
  SegmentGauge,
  StackedBarChart,
  StatBlock,
} from "@/components/elevora";
import { formatDays, monthKey } from "@/lib/leave/format";
import type { LeaveReportSummary, LeaveRequest } from "@/lib/leave/types";
import { t } from "@/i18n";

export function LeaveReportsPanel({
  summary,
  requests = [],
}: {
  summary: LeaveReportSummary;
  requests?: LeaveRequest[];
}) {
  const decided =
    summary.approvedThisMonth + summary.rejectedThisMonth;
  const approvalRate =
    decided > 0
      ? Math.round((summary.approvedThisMonth / decided) * 100)
      : 0;

  const stats = [
    {
      label: t("Days taken"),
      value: formatDays(
        summary.departmentUsage.reduce((s, d) => s + d.days, 0) ||
          summary.approvedThisMonth,
      ),
    },
    {
      label: t("Requests decided"),
      value: String(decided || summary.approvedThisMonth + summary.rejectedThisMonth),
    },
    {
      label: t("Approval rate"),
      value: decided > 0 ? `${approvalRate}%` : "—",
    },
    {
      label: t("Avg decision time"),
      value:
        summary.avgApprovalHours == null ? "—" : `${summary.avgApprovalHours}h`,
    },
  ];

  const monthly = useMemo(() => buildMonthlyUsage(requests), [requests]);
  const maxBar = Math.max(8, ...monthly.map((d) => d.values.reduce((a, b) => a + b, 0)));

  const returned = requests.filter((r) => r.status === "returned").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="min-w-0 rounded-sm border border-line bg-surface px-4 py-3"
          >
            <StatBlock label={s.label} value={s.value} size="sm" />
          </div>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <div className="rounded-sm border border-line bg-surface p-4 lg:col-span-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-ink">{t("Usage by month")}</h2>
            <span className="text-xs text-ink-muted">
              {t("Approved days by leave kind")}
            </span>
          </div>
          {monthly.every((d) => d.values.every((v) => v === 0)) ? (
            <p className="py-8 text-center text-sm text-ink-muted">
              {t("No approved leave to chart yet.")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <StackedBarChart
                seriesLabels={[t("Annual"), t("Sick"), t("Other")]}
                days={monthly}
                max={maxBar}
                min={0}
              />
            </div>
          )}
        </div>

        <div className="rounded-sm border border-line bg-surface p-4 lg:col-span-4">
          <h2 className="mb-2 text-base font-semibold text-ink">{t("Decisions")}</h2>
          <SegmentGauge
            percent={approvalRate}
            label={decided > 0 ? `${approvalRate}%` : "—"}
            sub={t("approved")}
          />
          <ul className="mt-3 space-y-2 border-t border-line pt-3">
            {[
              { label: t("Approved"), value: summary.approvedThisMonth },
              { label: t("Rejected"), value: summary.rejectedThisMonth },
              { label: t("Returned"), value: returned },
            ].map((row) => (
              <li key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-ink-muted">{row.label}</span>
                <b className="tabular-nums text-ink">{row.value}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {summary.departmentUsage.length > 0 ? (
        <div className="rounded-sm border border-line bg-surface p-4">
          <h2 className="mb-3 text-base font-semibold text-ink">
            {t("Leave by department")}
          </h2>
          <ul className="space-y-3">
            {summary.departmentUsage.map((d) => {
              const max = summary.departmentUsage[0]?.days || 1;
              return (
                <li key={d.department}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-ink">{d.department}</span>
                    <span className="tabular-nums text-ink-muted">
                      {formatDays(d.days)} · {d.people} {t("people")}
                    </span>
                  </div>
                  <HatchBar
                    size="sm"
                    percent={Math.max(8, (d.days / max) * 100)}
                    tone="accent"
                    animate={false}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function buildMonthlyUsage(requests: LeaveRequest[]) {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({
      key,
      label: d.toLocaleDateString(undefined, { month: "short" }),
    });
  }

  return months.map(({ key, label }) => {
    let annual = 0;
    let sick = 0;
    let other = 0;
    for (const r of requests) {
      if (r.status !== "approved") continue;
      const mk = r.approvedAt ? monthKey(r.approvedAt) : monthKey(r.startDate);
      if (mk !== key) continue;
      const name = r.leaveTypeName.toLowerCase();
      if (name.includes("annual") || name.includes("vacation")) annual += r.requestedDays;
      else if (name.includes("sick")) sick += r.requestedDays;
      else other += r.requestedDays;
    }
    return { label, values: [annual, sick, other] };
  });
}
