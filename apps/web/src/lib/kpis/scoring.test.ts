import { describe, expect, it } from "vitest";
import {
  achievementPercent,
  applyCap,
  buildDashboardSummary,
  kpiStatus,
  overallPerformanceScore,
  scoreKpis,
  weightedScore,
} from "./scoring";
import type { KpiItem } from "./types";

function item(partial: Partial<KpiItem> & Pick<KpiItem, "id" | "title" | "actualValue" | "targetValue" | "weight">): KpiItem {
  return {
    category: "goal_execution",
    roleScope: "sales",
    description: "",
    unit: "percent",
    period: "monthly",
    trend: "flat",
    trendDelta: 0,
    threshold: { minAcceptablePercent: 80, atRiskPercent: 90, optionalCap: 120 },
    status: "missing",
    owner: "Manager",
    source: "Test",
    notes: null,
    evidence: [],
    history: [],
    direction: "higher",
    lastUpdated: null,
    dueAt: null,
    formula: "",
    ...partial,
  };
}

describe("achievementPercent", () => {
  it("computes actual / target * 100", () => {
    expect(achievementPercent(80, 100)).toBe(80);
    expect(achievementPercent(120, 100)).toBe(120);
  });

  it("returns null when target or actual is missing", () => {
    expect(achievementPercent(null, 100)).toBeNull();
    expect(achievementPercent(10, 0)).toBeNull();
    expect(achievementPercent(0, 0)).toBe(100);
  });

  it("inverts the ratio when lower is better", () => {
    expect(achievementPercent(1, 2, "lower")).toBe(200);
    expect(achievementPercent(4, 2, "lower")).toBe(50);
    expect(achievementPercent(0, 2, "lower")).toBe(100);
  });
});

describe("weighted and overall scoring", () => {
  it("caps achievement then multiplies by weight", () => {
    expect(weightedScore(150, 20, 120)).toBe(2400);
    expect(applyCap(150, 120)).toBe(120);
  });

  it("overallPerformanceScore = sum(weightedScore) / sum(weights)", () => {
    const scored = [
      { weightedScore: 80 * 2, weight: 2 },
      { weightedScore: 90 * 3, weight: 3 },
      { weightedScore: 70 * 5, weight: 5 },
    ];
    expect(overallPerformanceScore(scored)).toBe(78);
  });

  it("excludes incomplete KPIs from the overall denominator", () => {
    const items = [
      item({ id: "a", title: "A", actualValue: 80, targetValue: 100, weight: 50 }),
      item({ id: "b", title: "B", actualValue: null, targetValue: 100, weight: 50 }),
    ];
    const scored = scoreKpis(items);
    expect(overallPerformanceScore(scored)).toBe(80);
    expect(scored[1]?.incomplete).toBe(true);
  });
});

describe("status and summary", () => {
  it("classifies exceeded, on track, at risk, below, missing", () => {
    expect(kpiStatus(110, 80, 90)).toBe("exceeded");
    expect(kpiStatus(95, 80, 90)).toBe("on_track");
    expect(kpiStatus(85, 80, 90)).toBe("at_risk");
    expect(kpiStatus(70, 80, 90)).toBe("below_target");
    expect(kpiStatus(null, 80, 90)).toBe("missing");
  });

  it("builds a dashboard summary from scored KPIs", () => {
    const scored = scoreKpis([
      item({
        id: "g",
        title: "Goals",
        actualValue: 100,
        targetValue: 100,
        weight: 40,
        category: "goal_execution",
      }),
      item({
        id: "p",
        title: "Prod",
        actualValue: 80,
        targetValue: 100,
        weight: 30,
        category: "productivity",
      }),
      item({
        id: "q",
        title: "Qual",
        actualValue: 90,
        targetValue: 100,
        weight: 30,
        category: "quality",
      }),
    ]);
    const summary = buildDashboardSummary(scored, 85, { percentile: 70, rank: 2, cohortSize: 8 }, 0);
    expect(summary.overallPerformanceScore).toBeCloseTo(91, 5);
    expect(summary.goalCompletionRate).toBeCloseTo(33.333, 2);
    expect(summary.previousOverall).toBe(85);
    expect(summary.overallDelta).toBeCloseTo(6, 5);
  });
});
