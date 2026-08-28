import type {
  CategoryScore,
  DashboardSummary,
  KpiCategoryId,
  KpiItem,
  KpiStatus,
  KpiTrend,
  ScoredKpi,
} from "./types";
import { KPI_CATEGORY_IDS } from "./types";

const DEFAULT_AT_RISK = 90;

export function achievementPercent(
  actualValue: number | null | undefined,
  targetValue: number | null | undefined,
  direction: "higher" | "lower" = "higher",
): number | null {
  if (actualValue == null || !Number.isFinite(actualValue)) return null;
  if (targetValue == null || !Number.isFinite(targetValue)) return null;

  if (direction === "lower") {
    if (actualValue <= 0 && targetValue <= 0) return 100;
    if (actualValue <= 0) return 100;
    if (targetValue < 0) return null;
    return (targetValue / actualValue) * 100;
  }

  if (targetValue === 0) {
    return actualValue === 0 ? 100 : null;
  }

  return (actualValue / targetValue) * 100;
}

export function applyCap(value: number, optionalCap?: number): number {
  if (optionalCap == null || !Number.isFinite(optionalCap)) return value;
  return Math.min(value, optionalCap);
}

export function weightedScore(
  achievement: number | null,
  weight: number,
  optionalCap?: number,
): number | null {
  if (achievement == null || !Number.isFinite(achievement)) return null;
  if (!Number.isFinite(weight) || weight <= 0) return null;
  return applyCap(achievement, optionalCap) * weight;
}

export function overallPerformanceScore(
  items: Array<{
    weightedScore: number | null;
    weight: number;
    incomplete?: boolean;
  }>,
): number | null {
  let weightedSum = 0;
  let weightSum = 0;
  for (const item of items) {
    if (item.weightedScore == null || item.incomplete) continue;
    if (!Number.isFinite(item.weight) || item.weight <= 0) continue;
    weightedSum += item.weightedScore;
    weightSum += item.weight;
  }
  if (weightSum <= 0) return null;
  return weightedSum / weightSum;
}

export function kpiStatus(
  achievement: number | null,
  minAcceptablePercent: number,
  atRiskPercent = DEFAULT_AT_RISK,
): KpiStatus {
  if (achievement == null) return "missing";
  if (achievement >= 100) return "exceeded";
  if (achievement >= atRiskPercent) return "on_track";
  if (achievement >= minAcceptablePercent) return "at_risk";
  return "below_target";
}

export function trendFromHistory(
  current: number | null,
  previous: number | null,
  epsilon = 0.75,
): { trend: KpiTrend; delta: number | null } {
  if (current == null) return { trend: previous == null ? "new" : "new", delta: null };
  if (previous == null) return { trend: "new", delta: null };
  const delta = current - previous;
  if (Math.abs(delta) < epsilon) return { trend: "flat", delta };
  return { trend: delta > 0 ? "up" : "down", delta };
}

export function scoreKpi(
  item: KpiItem,
  weightSum: number,
): ScoredKpi {
  const achievement = achievementPercent(
    item.actualValue,
    item.targetValue,
    item.direction,
  );
  const capped =
    achievement == null
      ? null
      : applyCap(achievement, item.threshold.optionalCap);
  const weighted = weightedScore(
    achievement,
    item.weight,
    item.threshold.optionalCap,
  );
  const incomplete = achievement == null;
  const contribution =
    weighted == null || weightSum <= 0 ? null : weighted / weightSum;

  return {
    ...item,
    achievementPercent: achievement,
    cappedAchievement: capped,
    weightedScore: weighted,
    weightedContribution: contribution,
    incomplete,
    status: kpiStatus(
      achievement,
      item.threshold.minAcceptablePercent,
      item.threshold.atRiskPercent,
    ),
  };
}

export function scoreKpis(items: KpiItem[]): ScoredKpi[] {
  const usableWeight = items.reduce((sum, item) => {
    const achievement = achievementPercent(
      item.actualValue,
      item.targetValue,
      item.direction,
    );
    return achievement == null ? sum : sum + item.weight;
  }, 0);
  const denominator = usableWeight > 0 ? usableWeight : items.reduce((s, i) => s + i.weight, 0);
  return items.map((item) => scoreKpi(item, denominator || 1));
}

export const CATEGORY_LABELS: Record<KpiCategoryId, string> = {
  goal_execution: "Goal execution",
  attendance_discipline: "Attendance & discipline",
  productivity: "Productivity",
  quality: "Quality",
  learning_development: "Learning & development",
  feedback_review: "Feedback / review",
};

export function scoreByCategory(scored: ScoredKpi[]): CategoryScore[] {
  return KPI_CATEGORY_IDS.map((id) => {
    const group = scored.filter((k) => k.category === id);
    return {
      id,
      label: CATEGORY_LABELS[id],
      score: overallPerformanceScore(group),
      weight: group.reduce((s, k) => s + k.weight, 0),
      kpiCount: group.length,
      metCount: group.filter(
        (k) => k.achievementPercent != null && k.achievementPercent >= 100,
      ).length,
      missingCount: group.filter((k) => k.incomplete).length,
    };
  }).filter((c) => c.kpiCount > 0);
}

export function goalCompletionRate(scored: ScoredKpi[]): number | null {
  const withData = scored.filter((k) => k.achievementPercent != null);
  if (withData.length === 0) return null;
  const met = withData.filter((k) => (k.achievementPercent ?? 0) >= 100).length;
  return (met / withData.length) * 100;
}

export function categoryScore(
  scored: ScoredKpi[],
  category: KpiCategoryId,
): number | null {
  return overallPerformanceScore(scored.filter((k) => k.category === category));
}

export function buildDashboardSummary(
  scored: ScoredKpi[],
  previousOverall: number | null,
  benchmarks: { percentile: number | null; rank: number | null; cohortSize: number },
  riskCount: number,
): DashboardSummary {
  const overall = overallPerformanceScore(scored);
  const incompleteCount = scored.filter((k) => k.incomplete).length;
  return {
    overallPerformanceScore: overall,
    previousOverall,
    overallDelta:
      overall == null || previousOverall == null
        ? null
        : overall - previousOverall,
    goalCompletionRate: goalCompletionRate(scored),
    productivityScore: categoryScore(scored, "productivity"),
    qualityScore: categoryScore(scored, "quality"),
    attendanceScore: categoryScore(scored, "attendance_discipline"),
    riskCount,
    percentile: benchmarks.percentile,
    rank: benchmarks.rank,
    cohortSize: benchmarks.cohortSize,
    incompleteCount,
    kpiCount: scored.length,
  };
}

export function roundScore(value: number | null, digits = 1): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
