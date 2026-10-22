"use client";

import { Button } from "@/components/ui/button";
import { Chip, HatchBar } from "@/components/elevora";
import { KpiStatusBadge } from "@/components/kpis/kpi-status-badge";
import { formatKpiValue, formatPercent } from "@/lib/kpis/format";
import type { ScoredKpi } from "@/lib/kpis/types";
import { t } from "@/i18n";

export function KpiMetricList({
  items,
  isAdmin,
  onOpen,
}: {
  items: ScoredKpi[];
  isAdmin: boolean;
  onOpen: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-sm border border-line bg-surface">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-line bg-surface-2 text-xs text-ink-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">{t("Metric")}</th>
            <th className="px-3 py-2.5 font-medium">{t("Target")}</th>
            <th className="px-3 py-2.5 font-medium">{t("Result")}</th>
            <th className="px-3 py-2.5 font-medium">{t("Weight")}</th>
            <th className="px-3 py-2.5 font-medium">{t("Progress")}</th>
            <th className="px-4 py-2.5 font-medium">{t("Action")}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((kpi) => {
            const pct = kpi.achievementPercent;
            const bar = pct == null ? 0 : Math.max(0, Math.min(pct, 100));
            const acknowledged = Boolean(kpi.acknowledgedAt);
            const canAck =
              !isAdmin &&
              kpi.latestScoreId &&
              !acknowledged &&
              !kpi.incomplete;
            return (
              <tr
                key={kpi.id}
                className="border-b border-line last:border-0 hover:bg-surface-2/60"
              >
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="min-w-0 text-left"
                    onClick={() => onOpen(kpi.id)}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-ink">{kpi.title}</span>
                      <KpiStatusBadge status={kpi.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {[kpi.category, kpi.employeeName]
                        .filter(Boolean)
                        .join(" · ") || t("Local KPI")}
                    </p>
                  </button>
                </td>
                <td className="px-3 py-3 tabular-nums text-ink-2">
                  {formatKpiValue(kpi.targetValue, kpi.unit)}
                </td>
                <td className="px-3 py-3 tabular-nums text-ink">
                  {formatKpiValue(kpi.actualValue, kpi.unit)}
                </td>
                <td className="px-3 py-3 tabular-nums text-ink-muted">
                  {kpi.weight != null ? `${kpi.weight}%` : "-"}
                </td>
                <td className="min-w-[120px] px-3 py-3">
                  <div className="space-y-1">
                    <HatchBar
                      percent={bar}
                      size="xs"
                      tone={
                        pct != null && pct < 75
                          ? "warn"
                          : pct != null && pct >= 100
                            ? "accent"
                            : "soft"
                      }
                    />
                    <p className="text-2xs text-ink-muted">
                      {pct != null ? formatPercent(pct, 0) : "-"}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {acknowledged ? (
                    <Chip tone="ok">{t("Acknowledged")}</Chip>
                  ) : (
                    <Button
                      size="sm"
                      variant={canAck || kpi.status === "missing" ? "default" : "outline"}
                      className="w-full sm:w-auto"
                      onClick={() => onOpen(kpi.id)}
                    >
                      {canAck
                        ? t("Acknowledge")
                        : kpi.status === "missing"
                          ? isAdmin
                            ? t("Add result")
                            : t("View")
                          : t("View")}
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
