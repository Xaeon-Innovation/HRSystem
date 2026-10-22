"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  AreaLine,
  EmptyState,
  MiniBars,
  Notice,
  PageHeader,
  SegmentGauge,
  StatBlock,
  Timeline,
} from "@/components/elevora";
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

type TimelineData = {
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
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{
      employee: { name: string; jobTitle: string | null; avatarUrl?: string | null };
      days: Day[];
    }>(`/v1/analytics/employees/${params.id}`)
      .then((res) => {
        setData(res);
        const day = res.days[0]?.day;
        if (day) {
          return api<TimelineData>(
            `/v1/analytics/timeline?employeeId=${params.id}&date=${day}`,
          ).then(setTimeline);
        }
      })
      .catch((e) => setError(e.message));
  }, [params.id]);

  const totals = useMemo(() => {
    if (!data?.days.length) return null;
    const days = data.days;
    const gpsUpdates = days.reduce((s, d) => s + d.gpsUpdatesCount, 0);
    const gpsExpected = days.reduce((s, d) => s + d.gpsExpectedCount, 0);
    return {
      jobs: days.reduce((s, d) => s + d.jobsCompletedCount, 0),
      visits: days.reduce((s, d) => s + d.visitsCompletedCount, 0),
      productivity:
        days.reduce((s, d) => s + d.productivityScore, 0) / days.length,
      revenue: days.reduce((s, d) => s + d.revenueGenerated, 0),
      gpsUpdates,
      gpsExpected,
      gpsPct: gpsExpected > 0 ? (gpsUpdates / gpsExpected) * 100 : 0,
    };
  }, [data]);

  const productivitySeries = useMemo(
    () => (data?.days ?? []).map((d) => d.productivityScore).reverse(),
    [data],
  );
  const jobsSeries = useMemo(
    () => (data?.days ?? []).map((d) => d.jobsCompletedCount).reverse(),
    [data],
  );
  const visitsSeries = useMemo(
    () => (data?.days ?? []).map((d) => d.visitsCompletedCount).reverse(),
    [data],
  );
  const revenueSeries = useMemo(
    () => (data?.days ?? []).map((d) => d.revenueGenerated).reverse(),
    [data],
  );

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("Employee analytics")} />
        <Notice tone="warn">{error}</Notice>
      </div>
    );
  }
  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.employee.name}
        subtitle={data.employee.jobTitle ?? t("Employee")}
        breadcrumbs={
          <Link href="/app/analytics" className="hover:underline">
            {t("← Analytics")}
          </Link>
        }
        actions={
          <UserAvatar
            name={data.employee.name}
            avatarUrl={data.employee.avatarUrl}
            size="lg"
          />
        }
      />

      {totals ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-line bg-surface p-4">
            <StatBlock label={t("Jobs")} value={totals.jobs} size="sm">
              {jobsSeries.length >= 2 ? (
                <MiniBars values={jobsSeries} className="mt-2" />
              ) : null}
            </StatBlock>
          </Card>
          <Card className="border-line bg-surface p-4">
            <StatBlock label={t("Visits")} value={totals.visits} size="sm">
              {visitsSeries.length >= 2 ? (
                <MiniBars values={visitsSeries} className="mt-2" />
              ) : null}
            </StatBlock>
          </Card>
          <Card className="border-line bg-surface p-4">
            <StatBlock
              label={t("Avg productivity")}
              value={totals.productivity.toFixed(1)}
              size="sm"
            >
              {productivitySeries.length >= 2 ? (
                <MiniBars values={productivitySeries} className="mt-2" />
              ) : null}
            </StatBlock>
          </Card>
          <Card className="border-line bg-surface p-4">
            <StatBlock
              label={t("Revenue")}
              value={totals.revenue.toFixed(0)}
              size="sm"
            >
              {revenueSeries.length >= 2 ? (
                <MiniBars values={revenueSeries} className="mt-2" />
              ) : null}
            </StatBlock>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-12">
        <Card className="border-line bg-surface p-4 lg:col-span-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t("Daily productivity")}
          </p>
          {productivitySeries.length >= 2 ? (
            <AreaLine values={productivitySeries} height={120} />
          ) : (
            <p className="text-sm text-ink-muted">{t("Not enough daily points yet.")}</p>
          )}
        </Card>
        <Card className="border-line bg-surface p-4 lg:col-span-4">
          {totals ? (
            <SegmentGauge
              percent={totals.gpsPct}
              label={`${Math.round(totals.gpsPct)}%`}
              sub={t("GPS updates vs expected")}
            />
          ) : null}
          {totals ? (
            <p className="mt-2 text-center text-xs text-ink-muted">
              {totals.gpsUpdates}/{totals.gpsExpected} {t("updates")}
            </p>
          ) : null}
        </Card>
      </div>

      {data.days.length === 0 ? (
        <Card className="overflow-hidden border-line bg-surface p-0">
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title={t("No daily summaries yet.")}
            subtitle={t("Summaries appear after attendance and connected systems sync.")}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.days.map((d) => (
            <Card key={d.day} className="border-line bg-surface p-4">
              <p className="text-sm font-semibold text-ink">{d.day}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {d.wasClockedIn ? t("clocked in") : t("absent")} ·{" "}
                {(d.totalWorkMinutes / 60).toFixed(1)}
                {t("h · late")} {d.latenessMinutes}
                {t("m · jobs")} {d.jobsCompletedCount} {t("· visits")}{" "}
                {d.visitsCompletedCount} {t("· tasks")} {d.tasksCompletedCount}{" "}
                {t("· GPS")} {d.gpsUpdatesCount}/{d.gpsExpectedCount}{" "}
                {t("· score")} {d.productivityScore.toFixed(1)}
              </p>
            </Card>
          ))}
        </div>
      )}

      {timeline ? (
        <Card className="border-line bg-surface p-4">
          <p className="text-sm font-semibold text-ink">
            {t("Timeline")} {timeline.date}
          </p>
          {timeline.events.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">
              {t("No combined events for this day.")}
            </p>
          ) : (
            <CardContent className="mt-3 p-0">
              <Timeline
                items={timeline.events.map((ev, i) => ({
                  id: `${ev.at}-${i}`,
                  meta: new Date(ev.at).toLocaleTimeString(),
                  title: `${ev.type}: ${ev.title}`,
                }))}
              />
            </CardContent>
          )}
        </Card>
      ) : null}
    </div>
  );
}
