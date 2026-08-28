"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { KpiStatusBadge } from "@/components/kpis/kpi-status-badge";
import { formatKpiValue, formatPercent } from "@/lib/kpis/format";
import type { ScoredKpi } from "@/lib/kpis/types";

export function KpiMetricList({
  items,
  isAdmin,
  onOpen,
}: {
  items: ScoredKpi[];
  isAdmin: boolean;
  onOpen: (id: string) => void;
}) {
  const needsWork = items.filter(
    (k) => k.status === "below_target" || k.status === "at_risk" || k.status === "missing",
  );
  const ok = items.filter(
    (k) => k.status === "on_track" || k.status === "exceeded",
  );

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      {needsWork.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Needs a result or is off target</h2>
          {needsWork.map((k) => (
            <MetricRow key={k.id} kpi={k} isAdmin={isAdmin} onOpen={onOpen} />
          ))}
        </section>
      ) : null}
      {ok.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">On track</h2>
          {ok.map((k) => (
            <MetricRow key={k.id} kpi={k} isAdmin={isAdmin} onOpen={onOpen} />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function MetricRow({
  kpi,
  isAdmin,
  onOpen,
}: {
  kpi: ScoredKpi;
  isAdmin: boolean;
  onOpen: (id: string) => void;
}) {
  const pct = kpi.achievementPercent;
  const bar = pct == null ? 0 : Math.max(0, Math.min(pct, 100));
  const action =
    kpi.status === "missing"
      ? isAdmin
        ? "Add result"
        : "View"
      : "View";

  return (
    <Card className="transition-shadow hover:shadow-sm">
      <CardContent className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => onOpen(kpi.id)}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium">{kpi.title}</p>
            <KpiStatusBadge status={kpi.status} />
            {kpi.employeeName ? (
              <span className="text-xs text-muted-foreground">{kpi.employeeName}</span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Goal {formatKpiValue(kpi.targetValue, kpi.unit)}
            {" · "}
            Result {formatKpiValue(kpi.actualValue, kpi.unit)}
            {pct != null ? ` · ${formatPercent(pct, 0)} of goal` : ""}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${bar}%` }}
            />
          </div>
        </button>
        <Button size="sm" variant={kpi.status === "missing" ? "default" : "outline"} onClick={() => onOpen(kpi.id)}>
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}
