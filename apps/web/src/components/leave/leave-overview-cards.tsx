import {
  CalendarCheck,
  Clock3,
  Palmtree,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDays } from "@/lib/leave/format";
import type { LeaveReportSummary } from "@/lib/leave/types";

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
          label: "Pending review",
          value: String(summary.pendingCount),
          hint: "Waiting on an approver",
          icon: Clock3,
        },
        {
          label: "Off today",
          value: String(summary.currentlyOff),
          hint: "Approved and in progress",
          icon: Users,
        },
        {
          label: "Approved this month",
          value: String(summary.approvedThisMonth),
          hint: `${summary.rejectedThisMonth} rejected`,
          icon: CalendarCheck,
        },
        {
          label: "Unused leave",
          value: formatDays(summary.unusedLeaveTotal),
          hint: "Balance liability across staff",
          icon: Palmtree,
        },
      ]
    : [
        {
          label: "Your remaining",
          value: remaining == null ? "—" : formatDays(remaining),
          hint: "Annual leave available",
          icon: Palmtree,
        },
        {
          label: "Pending",
          value: String(summary.pendingCount),
          hint: "Your requests in review",
          icon: Clock3,
        },
        {
          label: "Upcoming",
          value: String(summary.upcomingAbsences),
          hint: "Approved time off ahead",
          icon: CalendarCheck,
        },
        {
          label: "Off today (team)",
          value: String(summary.currentlyOff),
          hint: "Approved absences today",
          icon: Users,
        },
      ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label} className="overflow-hidden border-primary/10 bg-gradient-to-br from-white to-accent/25">
            <CardContent className="py-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
                <span className="rounded-md bg-card p-1.5 text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight">{c.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.hint}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
