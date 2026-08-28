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

export function CompensationOverviewCards({ summary }: { summary: OverviewSummary }) {
  const cutoffHint =
    summary.daysToCutoff < 0
      ? "Cutoff passed"
      : summary.daysToCutoff === 0
        ? "Cutoff is today"
        : `${summary.daysToCutoff} day${summary.daysToCutoff === 1 ? "" : "s"} left`;

  const cards = [
    {
      label: "Monthly salary liability",
      value: formatMoney(summary.monthlyLiability, summary.currency, { compact: true }),
      hint: `${summary.employeeCount} people in scope`,
      icon: CircleDollarSign,
    },
    {
      label: "Bonuses this cycle",
      value: formatMoney(summary.bonusesThisCycle, summary.currency, { compact: true }),
      hint: `${formatMoney(summary.commissionsThisCycle, summary.currency, { compact: true })} commissions`,
      icon: Banknote,
    },
    {
      label: "Pending approvals",
      value: String(summary.pendingApprovals),
      hint: "Salary and payout requests",
      icon: GitPullRequest,
    },
    {
      label: "Recent salary changes",
      value: String(summary.recentChangeCount),
      hint: "Last 90 days",
      icon: Users,
    },
    {
      label: "Outside salary band",
      value: String(summary.outOfBandCount),
      hint: "Below min or above max",
      icon: AlertTriangle,
    },
    {
      label: "Payroll cutoff",
      value: cutoffHint,
      hint: summary.upcomingCutoff,
      icon: CalendarClock,
    },
    {
      label: "Deductions this cycle",
      value: formatMoney(summary.deductionsThisCycle, summary.currency, { compact: true }),
      hint: "Recurring deduction lines",
      icon: TrendingDown,
    },
    {
      label: "Avg by department",
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
            className="overflow-hidden border-primary/10 bg-gradient-to-br from-white to-accent/25"
          >
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <span className="rounded-md bg-white/80 p-1.5 text-primary">
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
