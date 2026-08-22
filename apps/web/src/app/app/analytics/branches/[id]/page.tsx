"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

export default function BranchAnalyticsPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{
    branch: { name: string };
    days: Day[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ branch: { name: string }; days: Day[] }>(
      `/v1/analytics/branches/${params.id}`,
    )
      .then(setData)
      .catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/app/analytics" className="text-sm text-muted-foreground hover:underline">
          ← Analytics
        </Link>
        <h1 className="text-2xl font-semibold">{data.branch.name}</h1>
      </div>
      <div className="space-y-2">
        {data.days.map((d) => (
          <Card key={d.day}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{d.day}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              attendance {Math.round(d.attendanceRate * 100)}% · jobs{" "}
              {d.jobsCompletedCount} · visits {d.visitsCompletedCount} · revenue{" "}
              {d.revenueGenerated.toFixed(0)} · productivity{" "}
              {d.productivityIndex.toFixed(1)} · {d.activeEmployees} employees
            </CardContent>
          </Card>
        ))}
        {data.days.length === 0 ? (
          <p className="text-sm text-muted-foreground">No branch summaries yet.</p>
        ) : null}
      </div>
    </div>
  );
}
