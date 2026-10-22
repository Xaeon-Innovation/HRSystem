import { StatBlock } from "@/components/elevora";
import { formatDays } from "@/lib/hiring/format";
import type { RecruitmentMetricSummary } from "@/lib/hiring/types";
import { t } from "@/i18n";

export function HiringOverviewCards({ summary }: { summary: RecruitmentMetricSummary }) {
  const cards = [
    {
      label: t("Open roles"),
      value: String(summary.openPositions),
    },
    {
      label: t("Interviews today"),
      value: String(summary.interviewsToday),
    },
    {
      label: t("Pending offers"),
      value: String(summary.offersPending),
    },
    {
      label: t("Time to hire"),
      value: formatDays(summary.avgTimeToHireDays),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="min-w-0 rounded-sm border border-line bg-surface px-4 py-3"
        >
          <StatBlock label={c.label} value={c.value} size="sm" />
        </div>
      ))}
    </div>
  );
}
