import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/kpis/format";
import type { DashboardSummary } from "@/lib/kpis/types";
import { t } from "@/i18n";

function ScoreRing({ value }: { value: number | null }) {
  const v = value == null ? 0 : Math.max(0, Math.min(value, 100));
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - v / 100);
  const color =
    value == null
      ? "hsl(215 12% 72%)"
      : value >= 90
        ? "hsl(173 55% 32%)"
        : value >= 75
          ? "hsl(199 89% 32%)"
          : value >= 60
            ? "hsl(38 92% 42%)"
            : "hsl(0 72% 48%)";
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden>
      <circle cx="48" cy="48" r={r} fill="none" stroke="hsl(210 18% 90%)" strokeWidth="8" />
      <circle
        cx="48"
        cy="48"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform="rotate(-90 48 48)"
      />
      <text
        x="48"
        y="53"
        textAnchor="middle"
        className="fill-foreground"
        fontSize="18"
        fontWeight="700"
      >
        {value == null ? "—" : Math.round(value)}
      </text>
    </svg>
  );
}

function scoreWords(value: number | null): string {
  if (value == null) return "No results entered yet, so there is no score.";
  if (value >= 100) return "On or above target overall.";
  if (value >= 90) return "Close to target overall.";
  if (value >= 70) return "Below target on some metrics.";
  return "Needs attention — several metrics are off target.";
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
  /** When set, matching stat is highlighted (redesign drill-in). */
  activeFocus?: KpiDrillFocus | "";
  onDrill?: (focus: KpiDrillFocus) => void;
}) {
  const met =
    summary.goalCompletionRate == null || summary.kpiCount === 0
      ? "—"
      : `${Math.round((summary.goalCompletionRate / 100) * (summary.kpiCount - summary.incompleteCount))} of ${summary.kpiCount - summary.incompleteCount}`;

  const vsPrev =
    summary.overallDelta == null
      ? null
      : `${summary.overallDelta >= 0 ? "+" : ""}${formatNumber(summary.overallDelta, 0)} vs previous period`;

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-white to-accent/35 dark:from-card dark:to-accent/20">
      <CardContent className="flex flex-col gap-5 py-5 sm:flex-row sm:items-center">
        <ScoreRing value={hasActuals ? summary.overallPerformanceScore : null} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">
            {t("Overall score")}{periodLabel ? ` · ${periodLabel}` : ""}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">
            {hasActuals
              ? scoreWords(summary.overallPerformanceScore)
              : t("Targets are set. Enter a result on a metric to calculate the score.")}
          </p>
          {vsPrev ? (
            <p
              className={cn(
                "mt-2 inline-flex items-center gap-1 text-xs font-medium",
                summary.overallDelta != null && summary.overallDelta < 0
                  ? "text-rose-700"
                  : "text-emerald-700",
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
            <p className="mt-2 text-xs text-muted-foreground">
              {onDrill
                ? t("Tap a tile to filter the people queue.")
                : t("100 means the weighted mix of metrics hit their targets.")}
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-3 sm:w-72 sm:shrink-0">
          <Stat
            label="Hit target"
            value={hasActuals ? met : "—"}
            active={activeFocus === "on_track"}
            onClick={onDrill ? () => onDrill("on_track") : undefined}
          />
          <Stat
            label="Need a look"
            value={String(summary.riskCount)}
            active={activeFocus === "attention"}
            onClick={onDrill ? () => onDrill("attention") : undefined}
          />
          <Stat
            label="Incomplete"
            value={String(summary.incompleteCount)}
            active={activeFocus === "missing"}
            onClick={onDrill ? () => onDrill("missing") : undefined}
          />
        </div>
      </CardContent>
      {teamAverage != null && hasActuals && summary.overallPerformanceScore != null ? (
        <p className="border-t bg-muted/50 px-5 py-2 text-xs text-muted-foreground">
          {t("Team average")}{formatNumber(teamAverage, 0)}
          {summary.rank != null ? ` · Rank #${summary.rank} of ${summary.cohortSize}` : ""}
        </p>
      ) : null}
    </Card>
  );
}

function Stat({
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
    <>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "rounded-lg bg-card px-2 py-2 text-center ring-1 ring-transparent transition-colors hover:ring-primary/30",
          active && "bg-primary/10 ring-primary/40",
        )}
      >
        {inner}
      </button>
    );
  }

  return <div className="rounded-lg bg-card px-2 py-2 text-center">{inner}</div>;
}
