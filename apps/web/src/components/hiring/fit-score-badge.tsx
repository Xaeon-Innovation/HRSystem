"use client";

import { cn } from "@/lib/utils";
import { HatchBar, type HatchTone } from "@/components/elevora";
import { fitLabel, type FitScoreResult } from "@/lib/hiring/fit-score";
import { t } from "@/i18n";

function bandTone(band: NonNullable<FitScoreResult["band"]>): HatchTone {
  switch (band) {
    case "strong":
      return "accent";
    case "good":
      return "soft";
    case "fair":
      return "warn";
    case "weak":
      return "danger";
    default:
      return "idle";
  }
}

export function FitScoreBadge({
  result,
  compact = false,
}: {
  result: FitScoreResult;
  compact?: boolean;
}) {
  if (result.score == null || !result.band) {
    return (
      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-muted">
        —
      </span>
    );
  }
  const label = `${result.score} · ${fitLabel(result.band)}`;
  const title =
    result.knockout
      ? "Knockout screening failed"
      : result.missingSkills.length
        ? `Missing: ${result.missingSkills.join(", ")}`
        : result.matchedSkills.length
          ? `Matched: ${result.matchedSkills.join(", ")}`
          : "Job-fit score vs this opening";

  if (compact) {
    return (
      <span
        title={title}
        className="inline-flex min-w-[4.5rem] flex-col gap-0.5"
      >
        <span className="text-[10px] font-semibold tabular-nums text-ink">{result.score}</span>
        <HatchBar
          size="xs"
          percent={result.score}
          tone={bandTone(result.band)}
          animate={false}
        />
      </span>
    );
  }

  return (
    <span
      title={title}
      className={cn("inline-flex min-w-[6rem] flex-col gap-1 rounded-sm border border-line bg-surface px-2 py-1")}
    >
      <span className="text-[11px] font-semibold tabular-nums text-ink">{label}</span>
      <HatchBar size="xs" percent={result.score} tone={bandTone(result.band)} animate={false} />
    </span>
  );
}

export function FitScoreBreakdown({ result }: { result: FitScoreResult }) {
  if (result.score == null) {
    return (
      <p className="text-sm text-ink-muted">
        {t("No job attached, score appears once they are on an opening.")}
      </p>
    );
  }
  return (
    <div className="rounded-sm border border-line bg-surface-2 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-ink">{t("Job-fit score")}</p>
        <FitScoreBadge result={result} />
      </div>
      {result.knockout ? (
        <p className="mt-2 text-danger">{t("Knockout screening failed, score is floored.")}</p>
      ) : null}
      {result.matchedSkills.length > 0 ? (
        <p className="mt-2 text-xs text-ink-muted">
          {t("Matched:")}
          {result.matchedSkills.join(", ")}
        </p>
      ) : null}
      {result.missingSkills.length > 0 ? (
        <p className="mt-1 text-xs text-ink-muted">
          {t("Gaps:")}
          {result.missingSkills.join(", ")}
        </p>
      ) : null}
      <p className="mt-2 text-[11px] text-ink-muted">
        {t("Skills 50% · experience 25% · screening 15%")}
        {result.usedInterview
          ? t(" · interviews 10%")
          : t(" · interviews omitted until a scorecard exists")}
      </p>
    </div>
  );
}
