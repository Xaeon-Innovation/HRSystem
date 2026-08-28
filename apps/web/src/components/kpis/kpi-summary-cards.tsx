import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/kpis/format";
import type { DashboardSummary } from "@/lib/kpis/types";

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

export function KpiSummaryCards({
  summary,
  teamAverage,
  hasActuals,
}: {
  summary: DashboardSummary;
  teamAverage?: number | null;
  hasActuals: boolean;
}) {
  const met =
    summary.goalCompletionRate == null || summary.kpiCount === 0
      ? "—"
      : `${Math.round((summary.goalCompletionRate / 100) * (summary.kpiCount - summary.incompleteCount))} of ${summary.kpiCount - summary.incompleteCount}`;

  return (
    <Card className="overflow-hidden border-primary/15 bg-gradient-to-br from-white to-accent/35">
      <CardContent className="flex flex-col gap-5 py-5 sm:flex-row sm:items-center">
        <ScoreRing value={hasActuals ? summary.overallPerformanceScore : null} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground">Overall score</p>
          <p className="mt-0.5 text-sm leading-relaxed text-foreground/90">
            {hasActuals
              ? scoreWords(summary.overallPerformanceScore)
              : "Targets are set. Enter a result on a metric below to calculate the score."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            100 means the weighted mix of metrics hit their targets. Metrics without a result are left out.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:w-72 sm:shrink-0">
          <Stat
            label="Hit target"
            value={hasActuals ? met : "—"}
          />
          <Stat
            label="Need a look"
            value={String(summary.riskCount)}
          />
          <Stat
            label="vs last time"
            value={
              summary.overallDelta == null
                ? "—"
                : `${summary.overallDelta >= 0 ? "+" : ""}${formatNumber(summary.overallDelta, 0)}`
            }
            hint={
              summary.overallDelta == null ? undefined : summary.overallDelta >= 0 ? "up" : "down"
            }
          />
        </div>
      </CardContent>
      {teamAverage != null && hasActuals && summary.overallPerformanceScore != null ? (
        <p className="border-t bg-white/50 px-5 py-2 text-xs text-muted-foreground">
          Team average {formatNumber(teamAverage, 0)}
          {summary.rank != null ? ` · Rank #${summary.rank} of ${summary.cohortSize}` : ""}
        </p>
      ) : null}
    </Card>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: "up" | "down";
}) {
  return (
    <div className="rounded-lg bg-white/70 px-2 py-2 text-center">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 inline-flex items-center justify-center gap-1 text-lg font-semibold tabular-nums">
        {hint === "up" ? <TrendingUp className="h-3.5 w-3.5 text-emerald-700" /> : null}
        {hint === "down" ? <TrendingDown className="h-3.5 w-3.5 text-rose-700" /> : null}
        <span className={cn(hint === "down" && "text-rose-700", hint === "up" && "text-emerald-700")}>
          {value}
        </span>
      </p>
    </div>
  );
}
