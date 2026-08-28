import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { CategoryScore, KpiAlert, KpiCategoryId } from "@/lib/kpis/types";

const SEVERITY: Record<KpiAlert["severity"], string> = {
  high: "bg-rose-50 text-rose-800 ring-rose-200",
  medium: "bg-amber-50 text-amber-900 ring-amber-200",
  low: "bg-sky-50 text-sky-800 ring-sky-200",
};

export function KpiCategoryPanel({
  categories,
  active,
  onSelect,
}: {
  categories: CategoryScore[];
  active: KpiCategoryId | "";
  onSelect: (id: KpiCategoryId | "") => void;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Category breakdown</CardTitle>
        <p className="text-xs text-muted-foreground">
          Weighted score by KPI group — click to filter the table
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categorized KPIs in view.</p>
        ) : (
          categories.map((c) => {
            const selected = active === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onSelect(selected ? "" : c.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors",
                  selected ? "border-primary bg-accent" : "hover:bg-secondary/70",
                )}
              >
                <div>
                  <p className="text-sm font-medium">{c.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {c.metCount}/{c.kpiCount} at target
                    {c.missingCount ? ` · ${c.missingCount} missing` : ""}
                  </p>
                </div>
                <p className="text-lg font-semibold tabular-nums">
                  {c.score == null ? "—" : c.score.toFixed(0)}
                </p>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function KpiAlertsPanel({
  alerts,
  onSelect,
}: {
  alerts: KpiAlert[];
  onSelect: (kpiId?: string) => void;
}) {
  return (
    <Card className="h-full" id="kpi-alerts">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Alerts & exceptions</CardTitle>
        <p className="text-xs text-muted-foreground">
          Thresholds and gaps that need a decision, not just a number
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
            No active exceptions in this period.
          </p>
        ) : (
          alerts.slice(0, 8).map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => onSelect(alert.kpiId)}
              className={cn(
                "flex w-full flex-col rounded-lg px-3 py-2 text-left text-sm ring-1",
                SEVERITY[alert.severity],
              )}
            >
              <span className="font-medium">{alert.title}</span>
              <span className="text-xs opacity-80">{alert.detail}</span>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
