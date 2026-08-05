"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Metrics = {
  aggregates: { metric: string; total: number }[];
  recent: {
    id: string;
    metric: string;
    value: number;
    createdAt: string;
    meta: Record<string, unknown>;
  }[];
};

export default function HealthPage() {
  const [data, setData] = useState<Metrics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Metrics>("/v1/admin/health-metrics")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-destructive">{error}</p>;
  if (!data) return <p className="text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Health metrics</h1>
        <p className="text-sm text-muted-foreground">
          Missed clock-outs, sync failures, notification issues
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {data.aggregates.map((a) => (
          <Card key={a.metric}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {a.metric}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{a.total}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <ul className="space-y-2 text-sm">
        {data.recent.map((r) => (
          <li key={r.id} className="rounded-md border bg-white/70 px-3 py-2">
            {r.metric} · {r.value} · {new Date(r.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
