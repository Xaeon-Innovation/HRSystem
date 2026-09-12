"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { t } from "@/i18n";

type Day = {
  day: string;
  wasClockedIn: boolean;
  totalWorkMinutes: number;
  latenessMinutes: number;
  jobsCompletedCount: number;
  visitsCompletedCount: number;
  tasksCompletedCount: number;
  revenueGenerated: number;
  productivityScore: number;
  anomalyScore: number;
  gpsUpdatesCount: number;
  gpsExpectedCount: number;
};

type Timeline = {
  date: string;
  gpsCount: number;
  events: Array<{ at: string; type: string; title: string }>;
};

export default function EmployeeAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{
    employee: { name: string; jobTitle: string | null; avatarUrl?: string | null };
    days: Day[];
  } | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ employee: { name: string; jobTitle: string | null; avatarUrl?: string | null }; days: Day[] }>(
      `/v1/analytics/employees/${params.id}`,
    )
      .then((res) => {
        setData(res);
        const day = res.days[0]?.day;
        if (day) {
          return api<Timeline>(
            `/v1/analytics/timeline?employeeId=${params.id}&date=${day}`,
          ).then(setTimeline);
        }
      })
      .catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/analytics" className="text-sm text-muted-foreground hover:underline">
          {t("← Analytics")}</Link>
        <div className="mt-2 flex items-center gap-3">
          <UserAvatar
            name={data.employee.name}
            avatarUrl={data.employee.avatarUrl}
            size="lg"
          />
          <div>
            <h1 className="text-2xl font-semibold">{data.employee.name}</h1>
            <p className="text-sm text-muted-foreground">
              {data.employee.jobTitle ?? t("Employee")}
            </p>
          </div>
        </div>
      </div>
      <div className="space-y-2">
        {data.days.map((d) => (
          <Card key={d.day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.day}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {d.wasClockedIn ? t("clocked in") : "absent"} ·{" "}
              {(d.totalWorkMinutes / 60).toFixed(1)}{t("h · late")}{d.latenessMinutes}{t("m · jobs")}{d.jobsCompletedCount} {t("· visits")}{d.visitsCompletedCount} {t("· tasks")}{" "}
              {d.tasksCompletedCount} {t("· GPS")}{d.gpsUpdatesCount}/{d.gpsExpectedCount} {t("· score")}{d.productivityScore.toFixed(1)}
            </CardContent>
          </Card>
        ))}
      </div>
      {timeline ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Timeline")}{timeline.date}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {timeline.events.map((ev, i) => (
              <div key={`${ev.at}-${i}`}>
                <span className="text-muted-foreground">
                  {new Date(ev.at).toLocaleTimeString()}
                </span>{" "}
                {ev.type}: {ev.title}
              </div>
            ))}
            {timeline.events.length === 0 ? (
              <p className="text-muted-foreground">{t("No combined events for this day.")}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
