"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUiRedesign } from "@/hooks/use-ui-redesign";
import { PageSkeleton } from "@/components/ui/page-skeleton";
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
  const redesign = useUiRedesign();
  const [data, setData] = useState<Summary | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [drillMetric, setDrillMetric] = useState<DrillMetric | null>(null);
  const [drillRows, setDrillRows] = useState<DrillRow[]>([]);
  const [drillLoading, setDrillLoading] = useState(false);
  const [drillError, setDrillError] = useState<string | null>(null);
  const [trendOpen, setTrendOpen] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Summary>("/v1/analytics/summary"),
      api<{ branches: Branch[] }>("/v1/branches"),
      api<{ employees: Employee[] }>("/v1/employees").catch(() => ({
        employees: [] as Employee[],
      })),
    ])
      .then(([summary, org, emp]) => {
        setData(summary);
        setBranches(org.branches);
        setEmployees(emp.employees ?? []);
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

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <PageSkeleton />;

  const tiles = [
    { label: t("Attendance rate"), value: pct(data.kpis.attendanceRate) },
    { label: t("Active employees"), value: data.kpis.activeEmployees },
    { label: t("Jobs completed"), value: data.kpis.jobsCompleted },
    { label: t("Visits completed"), value: data.kpis.visitsCompleted },
    { label: t("Productivity"), value: data.kpis.productivityScore.toFixed(1) },
  ];

  if (!redesign) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{t("Analytics")}</h1>
            <p className="text-sm text-muted-foreground">
              {t("Workforce activity correlated with connected business systems ·")}{data.from} →{" "}
              {data.to}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/app/analytics/alerts">{t("Alerts")}</Link>
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {tiles.map((tile) => (
            <Card key={tile.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {tile.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{tile.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Trend")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.trend.map((row) => (
              <div key={row.day} className="flex flex-wrap justify-between gap-2">
                <span className="text-muted-foreground">{row.day}</span>
                <span>
                  {t("att")}{pct(row.attendanceRate)} {t("· jobs")}{row.jobs} {t("· visits")}{row.visits} {t("· rev")}{row.revenue.toFixed(0)}
                </span>
              </div>
            ))}
            {data.trend.length === 0 ? (
              <p className="text-muted-foreground">
                {t("No summary rows yet. Sync an integration or wait for the materializer.")}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("Branches")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {branches.map((b) => (
              <Link
                key={b.id}
                href={`/app/analytics/branches/${b.id}`}
                className="block text-sm hover:underline"
              >
                {b.name}
              </Link>
            ))}
            {branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("Create branches on the Employees page to slice analytics by location.")}</p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    );
  }

  const snapshot: Array<{
    label: string;
    value: string;
    hint: string;
    metric: DrillMetric | null;
  }> = [
    {
      label: t("Attendance"),
      value: pct(data.kpis.attendanceRate),
      hint: t("Share clocked in (latest day)"),
      metric: null,
    },
    {
      label: t("Active people"),
      value: String(data.kpis.activeEmployees),
      hint: t("In the selected window"),
      metric: null,
    },
    {
      label: t("Jobs done"),
      value: String(data.kpis.jobsCompleted),
      hint: t("Tap to drill by person"),
      metric: "jobs_completed",
    },
    {
      label: t("Visits done"),
      value: String(data.kpis.visitsCompleted),
      hint: t("Tap to drill by person"),
      metric: "visits_completed",
    },
  ];

  const secondary = [
    {
      label: t("Productivity"),
      value: data.kpis.productivityScore.toFixed(1),
      metric: "productivity" as const,
    },
    {
      label: t("Revenue linked"),
      value: data.kpis.revenue.toFixed(0),
      metric: "revenue" as const,
    },
  ];

  const trendPreview = data.trend.slice(-7);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("Analytics")}</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            {t("Snapshot first — drill a metric for people breakdown ·")}{data.from} → {data.to}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/app/analytics/alerts">{t("Alerts")}</Link>
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link href="/app/kpis">{t("Open performance")}</Link>
          </Button>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("Snapshot")}</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {snapshot.map((tile) => {
            const active = tile.metric != null && drillMetric === tile.metric;
            const clickable = Boolean(tile.metric);
            const content = (
              <Card
                className={cn(
                  "h-full transition-colors",
                  clickable && "group-hover:border-primary/30",
                  active && "border-primary/40 bg-primary/5",
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {tile.label}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">{tile.hint}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold tracking-tight">{tile.value}</p>
                </CardContent>
              </Card>
            );
            if (!tile.metric) return <div key={tile.label}>{content}</div>;
            return (
              <button
                key={tile.label}
                type="button"
                className="group text-left"
                onClick={() => openDrill(tile.metric!)}
              >
                {content}
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {secondary.map((tile) => {
            const active = drillMetric === tile.metric;
            return (
              <button
                key={tile.label}
                type="button"
                className="group text-left"
                onClick={() => openDrill(tile.metric)}
              >
                <Card
                  className={cn(
                    "transition-colors group-hover:border-primary/30",
                    active && "border-primary/40 bg-primary/5",
                  )}
                >
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{tile.label}</p>
                      <p className="text-xs text-muted-foreground">{t("Tap to drill by person")}</p>
                    </div>
                    <p className="text-2xl font-semibold tabular-nums">{tile.value}</p>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </section>

      {drillMetric ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {t("Drill-in ·")}{drillMetric.replace(/_/g, " ")}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setDrillMetric(null)}>
              {t("Close")}</Button>
          </div>
          <Card>
            <CardContent className="space-y-2 py-4 text-sm">
              {drillLoading ? (
                <p className="text-muted-foreground">{t("Loading breakdown…")}</p>
              ) : null}
              {drillError ? <p className="text-destructive">{drillError}</p> : null}
              {!drillLoading && !drillError && drillRows.length === 0 ? (
                <p className="text-muted-foreground">
                  {t("No rows for this metric yet. Sync an integration or wait for summaries.")}</p>
              ) : null}
              {drillRows.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2 last:border-0"
                >
                  <Link
                    href={`/app/analytics/employees/${row.key}`}
                    className="font-medium hover:underline"
                  >
                    {employeeName(row.key)}
                  </Link>
                  <span className="tabular-nums text-muted-foreground">
                    {formatDrillValue(drillMetric, row.value)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {t("Trend")}</h2>
          {data.trend.length > 7 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTrendOpen((o) => !o)}
            >
              {trendOpen ? t("Show last 7 days") : t("Show full range")}
            </Button>
          ) : null}
        </div>
        <Card>
          <CardContent className="space-y-2 py-4 text-sm">
            {(trendOpen ? data.trend : trendPreview).map((row) => (
              <div key={row.day} className="flex flex-wrap justify-between gap-2">
                <span className="text-muted-foreground">{row.day}</span>
                <span>
                  {t("att")}{pct(row.attendanceRate)} {t("· jobs")}{row.jobs} {t("· visits")}{" "}
                  {row.visits} {t("· rev")}{row.revenue.toFixed(0)}
                </span>
              </div>
            ))}
            {data.trend.length === 0 ? (
              <p className="text-muted-foreground">
                {t("No summary rows yet. Sync an integration or wait for the materializer.")}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {t("By branch")}</h2>
        <Card>
          <CardContent className="space-y-2 py-4">
            {branches.map((b) => (
              <Link
                key={b.id}
                href={`/app/analytics/branches/${b.id}`}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-2.5 text-sm hover:bg-secondary"
              >
                <span className="font-medium">{b.name}</span>
                <span className="text-xs text-muted-foreground">{t("Open →")}</span>
              </Link>
            ))}
            {branches.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("Create branches in")}{" "}
                <Link href="/app/settings/org" className="underline">
                  {t("Settings → Org")}</Link>{" "}
                {t("to slice analytics by location.")}</p>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
