import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CircleDollarSign,
  GitPullRequest,
  Percent,
  TrendingDown,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { IconTile, StatBlock } from "@/components/elevora";
import { formatMoney } from "@/lib/compensation/format";
import type { OverviewSummary } from "@/lib/compensation/types";
import { t } from "@/i18n";

export function CompensationOverviewCards({ summary }: { summary: OverviewSummary }) {
  const cutoffHint =
    summary.daysToCutoff < 0
      ? "Cutoff passed"
      : summary.daysToCutoff === 0
        ? "Cutoff is today"
        : `${summary.daysToCutoff} day${summary.daysToCutoff === 1 ? "" : "s"} left`;

  const cards = [
    {
      label: t("Monthly salary liability"),
      value: formatMoney(summary.monthlyLiability, summary.currency, { compact: true }),
      hint: `${summary.employeeCount} people in scope`,
      icon: CircleDollarSign,
    },
    {
      label: t("Bonuses this cycle"),
      value: formatMoney(summary.bonusesThisCycle, summary.currency, { compact: true }),
      hint: `${formatMoney(summary.commissionsThisCycle, summary.currency, { compact: true })} commissions`,
      icon: Banknote,
    },
    {
      label: t("Pending approvals"),
      value: String(summary.pendingApprovals),
      hint: t("Salary and payout requests"),
      icon: GitPullRequest,
    },
    {
      label: t("Recent salary changes"),
      value: String(summary.recentChangeCount),
      hint: t("Last 90 days"),
      icon: Users,
    },
    {
      label: t("Outside salary band"),
      value: String(summary.outOfBandCount),
      hint: t("Below min or above max"),
      icon: AlertTriangle,
    },
    {
      label: t("Payroll cutoff"),
      value: cutoffHint,
      hint: summary.upcomingCutoff,
      icon: CalendarClock,
    },
    {
      label: t("Deductions this cycle"),
      value: formatMoney(summary.deductionsThisCycle, summary.currency, { compact: true }),
      hint: t("Recurring deduction lines"),
      icon: TrendingDown,
    },
    {
      label: t("Avg by department"),
      value: summary.avgByDepartment[0]
        ? formatMoney(summary.avgByDepartment[0].average, summary.currency, { compact: true })
        : "-",
      hint: summary.avgByDepartment[0]
        ? `Highest: ${summary.avgByDepartment[0].department}`
        : "No departments",
      icon: Percent,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="border-line bg-surface p-4">
            <div className="flex items-start justify-between gap-2">
              <StatBlock label={c.label} value={c.value} size="sm" />
              <IconTile tone="neutral">
                <Icon className="h-3.5 w-3.5" />
              </IconTile>
            </div>
            <p className="mt-2 text-xs text-ink-muted">{c.hint}</p>
          </Card>
        );
      })}
    </div>
  );
}
