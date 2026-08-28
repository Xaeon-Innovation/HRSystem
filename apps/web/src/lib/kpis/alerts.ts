import type { KpiAlert, ReviewsModel, ScoredKpi } from "./types";
import { CATEGORY_LABELS, overallPerformanceScore } from "./scoring";
import { recommendationsFor } from "./templates";

export function buildAlerts(scored: ScoredKpi[], now = new Date()): KpiAlert[] {
  const alerts: KpiAlert[] = [];
  const today = now.toISOString();

  for (const kpi of scored) {
    if (kpi.status === "below_target") {
      alerts.push({
        id: `below-${kpi.id}`,
        kind: "below_target",
        severity: "high",
        title: `${kpi.title} is below target`,
        detail: `Achievement ${kpi.achievementPercent == null ? "n/a" : `${Math.round(kpi.achievementPercent)}%`} versus the agreed threshold.`,
        kpiId: kpi.id,
      });
    }
    if (kpi.trend === "down") {
      alerts.push({
        id: `trend-${kpi.id}`,
        kind: "declining_trend",
        severity: kpi.status === "below_target" ? "high" : "medium",
        title: `${kpi.title} is declining`,
        detail: `Trend versus the previous period is down${kpi.trendDelta != null ? ` (${kpi.trendDelta.toFixed(1)} pts)` : ""}.`,
        kpiId: kpi.id,
      });
    }
    if (kpi.incomplete || kpi.status === "missing") {
      alerts.push({
        id: `missing-${kpi.id}`,
        kind: "missing_data",
        severity: "medium",
        title: `Missing data for ${kpi.title}`,
        detail: "No actual value in the selected period. Reviews cannot be scored until this is recorded.",
        kpiId: kpi.id,
      });
    }
    if (kpi.dueAt && kpi.dueAt < today) {
      alerts.push({
        id: `overdue-${kpi.id}`,
        kind: "overdue_review",
        severity: "high",
        title: `Overdue review: ${kpi.title}`,
        detail: "The assignment due date has passed without a completed current-cycle review.",
        kpiId: kpi.id,
      });
    }
    if (
      kpi.category === "learning_development" &&
      kpi.dueAt &&
      kpi.dueAt > today &&
      new Date(kpi.dueAt).getTime() - now.getTime() < 14 * 86_400_000
    ) {
      alerts.push({
        id: `expiring-${kpi.id}`,
        kind: "expiring_development",
        severity: "low",
        title: `Development goal expiring: ${kpi.title}`,
        detail: "This learning goal is due within 14 days.",
        kpiId: kpi.id,
      });
    }
    if (
      (kpi.templateKey?.includes("compliance") ||
        kpi.title.toLowerCase().includes("compliance") ||
        kpi.title.toLowerCase().includes("training")) &&
      kpi.achievementPercent != null &&
      kpi.achievementPercent < 100
    ) {
      alerts.push({
        id: `training-${kpi.id}`,
        kind: "training_incomplete",
        severity: "high",
        title: `Mandatory training incomplete: ${kpi.title}`,
        detail: "Required completion is under 100% for this cycle.",
        kpiId: kpi.id,
      });
    }
  }

  const seen = new Set<string>();
  return alerts.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });
}

export function buildReviews(scored: ScoredKpi[]): ReviewsModel {
  const withNotes = scored
    .flatMap((k) =>
      k.history
        .filter((h) => h.notes)
        .map((h) => ({ kpi: k, history: h })),
    )
    .sort(
      (a, b) =>
        new Date(b.history.reviewDate).getTime() -
        new Date(a.history.reviewDate).getTime(),
    );

  const latest = withNotes[0];
  const overall = overallPerformanceScore(scored);
  const dueDates = scored
    .map((k) => k.dueAt)
    .filter((d): d is string => Boolean(d))
    .sort();
  const nextDue = dueDates.find((d) => d >= new Date().toISOString()) ?? dueDates[0] ?? null;
  const overdue = dueDates.some((d) => d < new Date().toISOString()) && scored.every((k) => k.incomplete);
  const hasScores = scored.some((k) => !k.incomplete);

  const weak = scored
    .filter((k) => k.status === "below_target" || k.status === "at_risk")
    .slice(0, 3);

  const training = new Set<string>();
  for (const kpi of weak) {
    for (const rec of recommendationsFor(kpi.templateKey, kpi.roleScope)) {
      training.add(rec);
    }
    if (kpi.category === "learning_development") {
      training.add(`Complete remaining ${CATEGORY_LABELS[kpi.category].toLowerCase()} actions`);
    }
  }

  return {
    managerReview: latest
      ? {
          reviewer: latest.kpi.owner,
          date: latest.history.reviewDate,
          rating: latest.kpi.achievementPercent,
          notes: latest.history.notes,
        }
      : null,
    selfAssessment: null,
    peerFeedback: null,
    appraisalStatus: overdue
      ? "overdue"
      : hasScores
        ? "in_progress"
        : "not_started",
    pipStatus: overall != null && overall < 70 ? "recommended" : "none",
    trainingRecommendations: [...training].slice(0, 4),
    nextReviewDate: nextDue,
  };
}
