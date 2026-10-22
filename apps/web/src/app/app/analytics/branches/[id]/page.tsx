"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Building2, Users } from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  AreaLine,
  EmptyState,
  ListRow,
  Notice,
  PageHeader,
  StatBlock,
} from "@/components/elevora";
import { t } from "@/i18n";

type Day = {
  day: string;
  attendanceRate: number;
  latenessRate: number;
  jobsCompletedCount: number;
  visitsCompletedCount: number;
  revenueGenerated: number;
  productivityIndex: number;
  activeEmployees: number;
};

type TopPerson = { key: string; value: number; name?: string };

export default function BranchAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{
    branch: { name: string };
    days: Day[];
  } | null>(null);
  const [topPeople, setTopPeople] = useState<TopPerson[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ branch: { name: string }; days: Day[] }>(
      `/v1/analytics/branches/${params.id}`,
    )
      .then(async (res) => {
        setData(res);
        try {
          const drill = await api<{ rows: Array<{ key: string; value: number }> }>(
            `/v1/analytics/drilldown?metric=productivity&groupBy=employee&branchId=${params.id}`,
          );
          const rows = [...(drill.rows ?? [])]
            .sort((a, b) => b.value - a.value)
            .slice(0, 8);
          const emp = await api<{
            employees: Array<{ id: string; name: string }>;
          }>("/v1/employees").catch(() => ({ employees: [] }));
          const names = new Map(emp.employees.map((e) => [e.id, e.name]));
          setTopPeople(
            rows.map((r) => ({
              ...r,
              name: names.get(r.key) ?? r.key.slice(0, 8),
            })),
          );
        } catch {
          setTopPeople([]);
        }
      })
      .catch((e) => setError(e.message));
  }, [params.id]);

  const attendanceSeries = useMemo(
    () => (data?.days ?? []).map((d) => d.attendanceRate * 100),
    [data],
  );

  const latest = data?.days[0];

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("Branch analytics")} />
        <Notice tone="warn">{error}</Notice>
      </div>
    );
  }
  if (!data) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.branch.name}
        subtitle={t("Daily branch summaries from connected systems.")}
        breadcrumbs={
          <Link href="/app/analytics" className="hover:underline">
            {t("← Analytics")}
          </Link>
        }
      />

      {latest ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-line bg-surface p-4">
            <StatBlock
              label={t("Attendance")}
              value={`${Math.round(latest.attendanceRate * 100)}%`}
              size="sm"
            />
          </Card>
          <Card className="border-line bg-surface p-4">
            <StatBlock
              label={t("Jobs")}
              value={latest.jobsCompletedCount}
              size="sm"
            />
          </Card>
          <Card className="border-line bg-surface p-4">
            <StatBlock
              label={t("Visits")}
              value={latest.visitsCompletedCount}
              size="sm"
            />
          </Card>
          <Card className="border-line bg-surface p-4">
            <StatBlock
              label={t("Productivity")}
              value={latest.productivityIndex.toFixed(1)}
              size="sm"
            />
          </Card>
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-12">
        <Card className="border-line bg-surface p-4 lg:col-span-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t("Attendance trend")}
          </p>
          {attendanceSeries.length >= 2 ? (
            <AreaLine values={attendanceSeries} height={120} />
          ) : data.days.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title={t("No branch summaries yet.")}
              subtitle={t("Summaries appear after the materializer runs for this branch.")}
            />
          ) : (
            <p className="text-sm text-ink-muted">{t("Not enough points yet.")}</p>
          )}
        </Card>
        <Card className="border-line bg-surface lg:col-span-4">
          <div className="border-b border-line px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t("Top people")}
            </p>
          </div>
          <CardContent className="px-4 py-0">
            {topPeople.length === 0 ? (
              <EmptyState
                icon={<Users className="h-5 w-5" />}
                title={t("No people ranked yet.")}
              />
            ) : (
              topPeople.map((p) => (
                <Link
                  key={p.key}
                  href={`/app/analytics/employees/${p.key}`}
                  className="block"
                >
                  <ListRow
                    title={p.name ?? p.key}
                    value={p.value.toFixed(1)}
                  />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {data.days.length > 0 ? (
        <div className="space-y-3">
          {data.days.map((d) => (
            <Card key={d.day} className="border-line bg-surface p-4">
              <p className="text-sm font-semibold text-ink">{d.day}</p>
              <p className="mt-1 text-sm text-ink-muted">
                {t("attendance")} {Math.round(d.attendanceRate * 100)}
                {t("% · jobs")} {d.jobsCompletedCount} {t("· visits")}{" "}
                {d.visitsCompletedCount} {t("· revenue")}{" "}
                {d.revenueGenerated.toFixed(0)} {t("· productivity")}{" "}
                {d.productivityIndex.toFixed(1)} · {d.activeEmployees}{" "}
                {t("employees")}
              </p>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
