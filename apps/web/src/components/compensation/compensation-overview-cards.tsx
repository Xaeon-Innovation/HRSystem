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
import { Card, CardContent } from "@/components/ui/card";
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
        : "—",
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
          <Card
            key={c.label}
            className="overflow-hidden border-primary/10 bg-gradient-to-br from-card to-accent/25"
          >
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <span className="rounded-md bg-card p-1.5 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 text-xl font-semibold tabular-nums tracking-tight sm:text-2xl">
                {c.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
