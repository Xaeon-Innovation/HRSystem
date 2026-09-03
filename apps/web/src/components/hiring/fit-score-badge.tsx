"use client";

import { cn } from "@/lib/utils";
import { fitLabel, type FitScoreResult } from "@/lib/hiring/fit-score";

export function FitScoreBadge({
  result,
  compact = false,
}: {
  result: FitScoreResult;
  compact?: boolean;
}) {
  if (result.score == null || !result.band) {
    return (
      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
        —
      </span>
    );
  }
  const label = `${result.score} · ${fitLabel(result.band)}`;
  return (
    <span
      title={
        result.knockout
          ? "Knockout screening failed"
          : result.missingSkills.length
            ? `Missing: ${result.missingSkills.join(", ")}`
            : result.matchedSkills.length
              ? `Matched: ${result.matchedSkills.join(", ")}`
              : "Job-fit score vs this opening"
      }
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ring-1",
        result.band === "strong" &&
          "bg-emerald-50 text-emerald-900 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
        result.band === "good" &&
          "bg-sky-50 text-sky-900 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
        result.band === "fair" &&
          "bg-amber-50 text-amber-950 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
        result.band === "weak" &&
          "bg-rose-50 text-rose-900 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
        compact && "px-1.5",
      )}
    >
      {label}
    </span>
  );
}

export function FitScoreBreakdown({ result }: { result: FitScoreResult }) {
  if (result.score == null) {
    return <p className="text-sm text-muted-foreground">No job attached — score appears once they are on an opening.</p>;
  }
  return (
    <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">Job-fit score</p>
        <FitScoreBadge result={result} />
      </div>
      {result.knockout ? (
        <p className="mt-2 text-rose-800 dark:text-rose-300">Knockout screening failed — score is floored.</p>
      ) : null}
      {result.matchedSkills.length > 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Matched: {result.matchedSkills.join(", ")}
        </p>
      ) : null}
      {result.missingSkills.length > 0 ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Gaps: {result.missingSkills.join(", ")}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Skills 50% · experience 25% · screening 15%
        {result.usedInterview ? " · interviews 10%" : " · interviews omitted until a scorecard exists"}
      </p>
    </div>
  );
}
