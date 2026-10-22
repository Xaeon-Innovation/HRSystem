import { StatBlock } from "@/components/elevora";
import { formatDays } from "@/lib/leave/format";
import type { LeaveReportSummary } from "@/lib/leave/types";
import { t } from "@/i18n";

export function LeaveOverviewCards({
  summary,
  remaining,
  isAdmin,
}: {
  summary: LeaveReportSummary;
  remaining: number | null;
  isAdmin: boolean;
}) {
  const cards = isAdmin
    ? [
        {
          label: t("Pending review"),
          value: String(summary.pendingCount),
          hint: t("Waiting on an approver"),
        },
        {
          label: t("Off today"),
          value: String(summary.currentlyOff),
          hint: t("Approved and in progress"),
        },
        {
          label: t("Approved this month"),
          value: String(summary.approvedThisMonth),
          hint: `${summary.rejectedThisMonth} rejected`,
        },
        {
          label: t("Unused leave"),
          value: formatDays(summary.unusedLeaveTotal),
          hint: t("Balance liability across staff"),
        },
      ]
    : [
        {
          label: t("Your remaining"),
          value: remaining == null ? "—" : formatDays(remaining),
          hint: t("Annual leave available"),
        },
        {
          label: t("Pending"),
          value: String(summary.pendingCount),
          hint: t("Your requests in review"),
        },
        {
          label: t("Upcoming"),
          value: String(summary.upcomingAbsences),
          hint: t("Approved time off ahead"),
        },
        {
          label: t("Off today (team)"),
          value: String(summary.currentlyOff),
          hint: t("Approved absences today"),
        },
      ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="min-w-0 rounded-sm border border-line bg-surface px-4 py-3"
        >
          <StatBlock label={c.label} value={c.value} size="sm">
            <p className="text-2xs text-ink-muted">{c.hint}</p>
          </StatBlock>
        </div>
      ))}
    </div>
  );
}
