"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  DollarSign,
  MapPin,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  AreaLine,
  EmptyState,
  IconTile,
  ListRow,
  Notice,
  PageHeader,
  Segmented,
  StackedBarChart,
  StatBlock,
} from "@/components/elevora";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

type Summary = {
  from: string;
  to: string;
  kpis: {
    attendanceRate: number;
    activeEmployees: number;
    jobsCompleted: number;
    visitsCompleted: number;
    productivityScore: number;
    laborCostVsOutput: number;
    revenue: number;
  };
  trend: Array<{
    day: string;
    attendanceRate: number;
    jobs: number;
    visits: number;
    revenue: number;
    productivity: number;
  }>;
};

type Branch = { id: string; name: string };
type Employee = { id: string; name: string };

type DrillMetric =
  | "jobs_completed"
  | "visits_completed"
  | "revenue"
  | "productivity";

type DrillRow = { key: string; value: number };

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function formatDrillValue(metric: DrillMetric, value: number) {
  if (metric === "revenue") return value.toFixed(0);
  if (metric === "productivity") return value.toFixed(1);
  return String(Math.round(value));
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drillMetric, setDrillMetric] = useState<DrillMetric | null>(null);
  const [drillRows, setDrillRows] = useState<DrillRow[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [range, setRange] = useState<"7d" | "full">("7d");
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    Promise.all([
      api<Summary>("/v1/analytics/summary"),
      api<{ branches: Branch[] }>("/v1/branches"),
      api<{ employees: Employee[] }>("/v1/employees").catch(() => ({
        employees: [] as Employee[],
      })),
      api<{ alerts: Array<{ id: string }> }>("/v1/analytics/alerts").catch(() => ({
        alerts: [] as Array<{ id: string }>,
      })),
    ])
      .then(([summary, org, emp, alerts]) => {
        setData(summary);
        setBranches(org.branches);
        setEmployees(emp.employees ?? []);
        setAlertCount(alerts.alerts?.length ?? 0);
      })
      .catch((e) => setError(e.message));
  }, []);

  const employeeName = useMemo(() => {
    const map = new Map(employees.map((e) => [e.id, e.name]));
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [employees]);

  async function openDrill(metric: DrillMetric) {
    if (drillMetric === metric) {
      setDrillMetric(null);
      setDrillRows([]);
      setDrillError(null);
      return;
    }
    setDrillMetric(metric);
    setDrillLoading(true);
    setDrillError(null);
    try {
      const res = await api<{ rows: DrillRow[] }>(
        `/v1/analytics/drilldown?metric=${metric}&groupBy=employee`,
      );
      setDrillRows(
        [...(res.rows ?? [])].sort((a, b) => b.value - a.value).slice(0, 12),
      );
    } catch (e) {
      setDrillRows([]);
      setDrillError(e instanceof Error ? e.message : "Drill-down failed");
    } finally {
      setDrillLoading(false);
    }
  }

  if (error) {
    return (
      <div className="space-y-4">
        <PageHeader title={t("Analytics")} />
        <Notice tone="warn">{error}</Notice>
      </div>
    );
  }
  if (!data) return <PageSkeleton />;

  const snapshot: Array<{
    label: string;
    value: string;
    hint: string;
    metric: DrillMetric | null;
    icon: typeof Activity;
  }> = [
    {
      label: t("Attendance"),
      value: pct(data.kpis.attendanceRate),
      hint: t("Share clocked in (latest day)"),
      metric: null,
      icon: Activity,
    },
    {
      label: t("Active people"),
      value: String(data.kpis.activeEmployees),
      hint: t("In the selected window"),
      metric: null,
      icon: Users,
    },
    {
      label: t("Jobs done"),
      value: String(data.kpis.jobsCompleted),
      hint: t("Tap to drill by person"),
      metric: "jobs_completed",
      icon: Briefcase,
    },
    {
      label: t("Visits done"),
      value: String(data.kpis.visitsCompleted),
      hint: t("Tap to drill by person"),
      metric: "visits_completed",
      icon: MapPin,
    },
    {
      label: t("Productivity"),
      value: data.kpis.productivityScore.toFixed(1),
      hint: t("Tap to drill by person"),
      metric: "productivity",
      icon: BarChart3,
    },
    {
      label: t("Revenue linked"),
      value: data.kpis.revenue.toFixed(0),
      hint: t("Tap to drill by person"),
      metric: "revenue",
      icon: DollarSign,
    },
  ];

  const trendSlice =
    range === "7d" ? data.trend.slice(-7) : data.trend;
  const revenueTrend = trendSlice.map((row) => row.revenue);
  const stackedDays = trendSlice.map((row) => ({
    label: row.day.slice(5),
    values: [row.jobs, row.visits],
  }));
  const stackMax = Math.max(
    10,
    ...stackedDays.flatMap((d) => d.values),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Analytics")}
        subtitle={`${t("Snapshot first, drill a metric for people breakdown ·")} ${data.from} → ${data.to}`}
        actions={
          <>
            <Segmented
              aria-label={t("Range")}
              value={range}
              onChange={setRange}
              options={[
                { value: "7d", label: t("Last 7 days") },
                { value: "full", label: t("Full range") },
              ]}
            />
            <Button asChild className="w-full sm:w-auto">
              <Link href="/app/kpis">{t("Performance")}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href="/app/analytics/alerts">
                {t("Alerts")}
                {alertCount > 0 ? ` · ${alertCount}` : ""}
              </Link>
            </Button>
          </>
        }
      />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t("Snapshot")}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]">
          {snapshot.map((tile) => {
            const active = tile.metric != null && drillMetric === tile.metric;
            const clickable = Boolean(tile.metric);
            const Icon = tile.icon;
            const content = (
              <Card
                className={cn(
                  "h-full border-line bg-surface p-4 transition-colors",
                  clickable && "group-hover:border-line-strong",
                  active && "border-accent/40 bg-accent-tint",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <StatBlock label={tile.label} value={tile.value} size="sm" />
                  <IconTile tone="neutral">
                    <Icon className="h-3.5 w-3.5" />
                  </IconTile>
                </div>
                <p className="mt-2 text-xs text-ink-muted">{tile.hint}</p>
              </Card>
            );
            if (!tile.metric) {
              return <div key={tile.label}>{content}</div>;
            }
            return (
              <button
                key={tile.label}
                type="button"
                className="group min-w-0 text-left"
                onClick={() => openDrill(tile.metric!)}
              >
                {content}
              </button>
            );
          })}
        </div>
      </section>

      {drillMetric ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              {t("Drill-in ·")} {drillMetric.replace(/_/g, " ")}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setDrillMetric(null)}>
              {t("Close")}
            </Button>
          </div>
          <Card className="overflow-hidden border-line bg-surface p-0">
            <CardContent className="px-4 py-0">
              {drillLoading ? (
                <p className="py-4 text-sm text-ink-muted">{t("Loading breakdown…")}</p>
              ) : null}
              {drillError ? (
                <Notice tone="warn" className="m-4">
                  {drillError}
                </Notice>
              ) : null}
              {!drillLoading && !drillError && drillRows.length === 0 ? (
                <EmptyState
                  icon={<BarChart3 className="h-5 w-5" />}
                  title={t("No rows for this metric yet.")}
                  subtitle={t("Sync an integration or wait for summaries.")}
                />
              ) : null}
              {drillRows.map((row) => (
                <ListRow
                  key={row.key}
                  title={
                    <Link
                      href={`/app/analytics/employees/${row.key}`}
                      className="hover:underline"
                    >
                      {employeeName(row.key)}
                    </Link>
                  }
                  value={formatDrillValue(drillMetric, row.value)}
                />
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-3 lg:grid-cols-12">
        <Card className="border-line bg-surface p-4 lg:col-span-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t("Trend · jobs and visits")}
          </h2>
          {stackedDays.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-5 w-5" />}
              title={t("No summary rows yet.")}
              subtitle={t("Sync an integration or wait for the materializer.")}
            />
          ) : (
            <div className="overflow-x-auto">
              <StackedBarChart
                seriesLabels={[t("Jobs"), t("Visits")]}
                days={stackedDays}
                max={stackMax}
                min={0}
              />
            </div>
          )}
        </Card>
        <Card className="border-line bg-surface p-4 lg:col-span-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t("Revenue linked")}
          </h2>
          {revenueTrend.length >= 2 ? (
            <AreaLine values={revenueTrend} height={160} />
          ) : (
            <p className="text-sm text-ink-muted">{t("Not enough revenue points yet.")}</p>
          )}
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          {t("By branch")}
        </h2>
        <Card className="overflow-hidden border-line bg-surface p-0">
          {branches.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-5 w-5" />}
              title={t("No branches yet.")}
              subtitle={t("Create branches in Settings → Org to slice analytics by location.")}
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/app/settings/org">{t("Settings → Org")}</Link>
                </Button>
              }
            />
          ) : (
            <CardContent className="px-4 py-0">
              {branches.map((b) => (
                <Link
                  key={b.id}
                  href={`/app/analytics/branches/${b.id}`}
                  className="block"
                >
                  <ListRow
                    title={b.name}
                    subtitle={t("Open branch analytics")}
                    value={t("Open →")}
                  />
                </Link>
              ))}
            </CardContent>
          )}
        </Card>
      </section>
    </div>
  );
}
