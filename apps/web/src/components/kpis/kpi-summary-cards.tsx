import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentGauge, StatBlock } from "@/components/elevora";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/kpis/format";
import type { DashboardSummary } from "@/lib/kpis/types";
import { t } from "@/i18n";

function scoreWords(value: number | null): string {
  if (value == null) return "No results entered yet, so there is no score.";
  if (value >= 100) return "On or above target overall.";
  if (value >= 90) return "Close to target overall.";
  if (value >= 70) return "Below target on some metrics.";
  return "Needs attention, several metrics are off target.";
}

export type KpiDrillFocus = "attention" | "on_track" | "missing";

export function KpiSummaryCards({
  summary,
  teamAverage,
  hasActuals,
  periodLabel,
  activeFocus,
  onDrill,
}: {
  summary: DashboardSummary;
  teamAverage?: number | null;
  hasActuals: boolean;
  /** Calendar period label, e.g. "Sep 2026". */
  periodLabel?: string;
  /** When set, matching stat is highlighted (drill-in). */
  activeFocus?: KpiDrillFocus | "";
  onDrill?: (focus: KpiDrillFocus) => void;
}) {
  const met =
    summary.goalCompletionRate == null || summary.kpiCount === 0
      ? "-"
      : `${Math.round((summary.goalCompletionRate / 100) * (summary.kpiCount - summary.incompleteCount))} of ${summary.kpiCount - summary.incompleteCount}`;

  const vsPrev =
    summary.overallDelta == null
      ? null
      : `${summary.overallDelta >= 0 ? "+" : ""}${formatNumber(summary.overallDelta, 0)} vs previous period`;

  const score =
    hasActuals && summary.overallPerformanceScore != null
      ? summary.overallPerformanceScore
      : null;

  return (
    <Card className="overflow-hidden border-line bg-surface">
      <CardContent className="flex flex-col gap-5 py-5 sm:flex-row sm:items-center">
        {score != null ? (
          <SegmentGauge
            percent={score}
            label={Math.round(score)}
            sub={periodLabel ? periodLabel : t("Overall")}
            className="sm:w-52 shrink-0"
          />
        ) : (
          <div className="flex h-[118px] w-full max-w-[260px] items-center justify-center rounded-sm border border-dashed border-line bg-surface-2 text-sm text-ink-muted">
            {t("No score yet")}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {t("Overall score")}
            {periodLabel ? ` · ${periodLabel}` : ""}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-ink-2">
            {hasActuals
              ? scoreWords(summary.overallPerformanceScore)
              : t("Targets are set. Enter a result on a metric to calculate the score.")}
          </p>
          {vsPrev ? (
            <p
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                summary.overallDelta != null && summary.overallDelta < 0
                  ? "text-danger"
                  : "text-accent-ink",
              )}
            >
              {summary.overallDelta != null && summary.overallDelta < 0 ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5" />
              )}
              {vsPrev}
            </p>
          ) : (
            <p className="mt-2 text-xs text-ink-muted">
              {onDrill
                ? t("Tap a tile to filter the people queue.")
                : t("100 means the weighted mix of metrics hit their targets.")}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:w-72 sm:shrink-0">
          <DrillStat
            label={t("Hit target")}
            value={hasActuals ? met : "-"}
            active={activeFocus === "on_track"}
            onClick={onDrill ? () => onDrill("on_track") : undefined}
          />
          <DrillStat
            label={t("Need a look")}
            value={String(summary.riskCount)}
            active={activeFocus === "attention"}
            onClick={onDrill ? () => onDrill("attention") : undefined}
          />
          <DrillStat
            label={t("Incomplete")}
            value={String(summary.incompleteCount)}
            active={activeFocus === "missing"}
            onClick={onDrill ? () => onDrill("missing") : undefined}
          />
        </div>
      </CardContent>
      {teamAverage != null && hasActuals && summary.overallPerformanceScore != null ? (
        <p className="border-t border-line bg-surface-2 px-5 py-2 text-xs text-ink-muted">
          {t("Team average")}
          {formatNumber(teamAverage, 0)}
          {summary.rank != null
            ? ` · Rank #${summary.rank} of ${summary.cohortSize}`
            : ""}
        </p>
      ) : null}
    </Card>
  );
}

function DrillStat({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <StatBlock label={label} value={value} size="sm" className="text-center" />
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "rounded-sm border border-line bg-surface-2 px-2 py-2 transition-colors hover:border-line-strong",
          active && "border-accent/40 bg-accent-tint",
        )}
      >
        {inner}
      </button>
    );
  }

  return (
    <div className="rounded-sm border border-line bg-surface-2 px-2 py-2">
      {inner}
    </div>
  );
}
