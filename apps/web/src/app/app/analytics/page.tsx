"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<Summary>("/v1/analytics/summary"),
      api<{ branches: Branch[] }>("/v1/branches"),
    ])
      .then(([summary, org]) => {
        setData(summary);
        setBranches(org.branches);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Loading analytics…</p>;

  const tiles = [
    { label: "Attendance rate", value: pct(data.kpis.attendanceRate) },
    { label: "Active employees", value: data.kpis.activeEmployees },
    { label: "Jobs completed", value: data.kpis.jobsCompleted },
    { label: "Visits completed", value: data.kpis.visitsCompleted },
    { label: "Productivity", value: data.kpis.productivityScore.toFixed(1) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Workforce activity correlated with connected business systems · {data.from} →{" "}
            {data.to}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/app/analytics/alerts">Alerts</Link>
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((t) => (
          <Card key={t.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{t.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Trend</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.trend.map((row) => (
            <div key={row.day} className="flex flex-wrap justify-between gap-2">
              <span className="text-muted-foreground">{row.day}</span>
              <span>
                att {pct(row.attendanceRate)} · jobs {row.jobs} · visits {row.visits} ·
                rev {row.revenue.toFixed(0)}
              </span>
            </div>
          ))}
          {data.trend.length === 0 ? (
            <p className="text-muted-foreground">
              No summary rows yet. Sync an integration or wait for the materializer.
            </p>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branches</CardTitle>
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
              Create branches on the Employees page to slice analytics by location.
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
