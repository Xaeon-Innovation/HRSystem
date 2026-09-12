import {
  Briefcase,
  CalendarClock,
  Clock3,
  FileSignature,
  Hourglass,
  Timer,
  UserCheck,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDays } from "@/lib/hiring/format";
import type { RecruitmentMetricSummary } from "@/lib/hiring/types";
import { t } from "@/i18n";

export function HiringOverviewCards({ summary }: { summary: RecruitmentMetricSummary }) {
  const bottleneck = summary.stageCounts
    .filter((s) => s.stage !== "hired" && s.stage !== "rejected" && s.count > 0)
    .sort((a, b) => (b.avgDays ?? 0) - (a.avgDays ?? 0))[0];

  const cards = [
    {
      label: t("Open positions"),
      value: String(summary.openPositions),
      hint: `${summary.openingsHeadcount} seat${summary.openingsHeadcount === 1 ? "" : "s"} to fill`,
      icon: Briefcase,
    },
    {
      label: t("In pipeline"),
      value: String(summary.candidatesInPipeline),
      hint: t("Active candidates"),
      icon: Users,
    },
    {
      label: t("Interviews today"),
      value: String(summary.interviewsToday),
      hint: t("Scheduled on the calendar"),
      icon: CalendarClock,
    },
    {
      label: t("Offers pending"),
      value: String(summary.offersPending),
      hint: t("Sent or awaiting approval"),
      icon: FileSignature,
    },
    {
      label: t("Hires this month"),
      value: String(summary.hiresThisMonth),
      hint: t("Marked hired"),
      icon: UserCheck,
    },
    {
      label: t("Time to hire"),
      value: formatDays(summary.avgTimeToHireDays),
      hint: t("Entry → offer accepted"),
      icon: Timer,
    },
    {
      label: t("Time to fill"),
      value: formatDays(summary.avgTimeToFillDays),
      hint: t("Req open → offer accepted"),
      icon: Clock3,
    },
    {
      label: t("Stage bottlenecks"),
      value: String(summary.bottleneckCount),
      hint: bottleneck
        ? `Slowest: ${bottleneck.label} (${formatDays(bottleneck.avgDays)})`
        : "No aging stages",
      icon: Hourglass,
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
