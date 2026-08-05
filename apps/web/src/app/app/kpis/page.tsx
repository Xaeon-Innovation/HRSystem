"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Kpi = {
  id: string;
  name: string;
  type: string;
  targetValue: number | null;
  reviewPeriod: string;
};

type SummaryItem = {
  assignment: { id: string; dueAt: string | null };
  kpi: Kpi | null;
  scores: { score: number; reviewDate: string; notes: string | null }[];
};

export default function KpisPage() {
  const user = typeof window !== "undefined" ? getUser() : null;
  const isAdmin = user?.role === "tenant_admin";
  const [kpis, setKpis] = useState<Kpi[]>([]);
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("100");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (isAdmin) {
      const data = await api<{ kpis: Kpi[] }>("/v1/kpis");
      setKpis(data.kpis);
    }
    const s = await api<{ summary: SummaryItem[] }>("/v1/kpis/summary");
    setSummary(s.summary);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function createKpi(e: FormEvent) {
    e.preventDefault();
    try {
      await api("/v1/kpis", {
        method: "POST",
        body: JSON.stringify({
          name,
          type: "numeric",
          targetValue: Number(target),
          reviewPeriod: "monthly",
        }),
      });
      setName("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">KPIs</h1>
        <p className="text-sm text-muted-foreground">
          Performance targets and review scores
        </p>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Create KPI template</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-3 md:grid-cols-3" onSubmit={createKpi}>
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Target</Label>
                <Input
                  type="number"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  Create
                </Button>
              </div>
            </form>
            <ul className="mt-4 space-y-2 text-sm">
              {kpis.map((k) => (
                <li key={k.id} className="flex items-center justify-between rounded border px-3 py-2">
                  <span>
                    {k.name} · target {k.targetValue ?? "—"} · {k.reviewPeriod}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      api(`/v1/kpis/${k.id}/clone`, { method: "POST" }).then(load)
                    }
                  >
                    Clone
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      <div className="space-y-3">
        <h2 className="text-lg font-medium">Summary</h2>
        {summary.length === 0 ? (
          <p className="text-sm text-muted-foreground">No KPI assignments yet.</p>
        ) : (
          summary.map((s) => (
            <Card key={s.assignment.id}>
              <CardContent className="py-3">
                <p className="font-medium">{s.kpi?.name ?? "KPI"}</p>
                <p className="text-xs text-muted-foreground">
                  Target {s.kpi?.targetValue ?? "—"} · {s.scores.length} reviews
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {s.scores.map((sc, i) => (
                    <li key={i}>
                      {sc.score} on {new Date(sc.reviewDate).toLocaleDateString()}
                      {sc.notes ? ` — ${sc.notes}` : ""}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
