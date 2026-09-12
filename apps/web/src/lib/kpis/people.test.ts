import { describe, expect, it } from "vitest";
import { buildPeopleQueue } from "./people";
import type { ScoredKpi } from "./types";

function metric(
  partial: Partial<ScoredKpi> & Pick<ScoredKpi, "id" | "employeeId" | "status">,
): ScoredKpi {
  return {
    title: "M",
    category: "goal_execution",
    roleScope: "sales",
    description: "",
    targetValue: 100,
    actualValue: 80,
    unit: "percent",
    weight: 10,
    period: "monthly",
    trend: "flat",
    trendDelta: 0,
    threshold: { minAcceptablePercent: 80, atRiskPercent: 90 },
    owner: "Mgr",
    source: "t",
    notes: null,
    evidence: [],
    history: [],
    direction: "higher",
    lastUpdated: null,
    dueAt: null,
    formula: "",
    achievementPercent: 80,
    cappedAchievement: 80,
    weightedScore: 800,
    weightedContribution: 800,
    incomplete: partial.status === "missing",
    employeeName: "X",
    ...partial,
  };
}

describe("buildPeopleQueue", () => {
  it("orders need_look before incomplete before on_track", () => {
    const scored = [
      metric({ id: "1", employeeId: "a", status: "on_track", incomplete: false }),
      metric({ id: "2", employeeId: "b", status: "missing", incomplete: true, actualValue: null }),
      metric({
        id: "3",
        employeeId: "c",
        status: "below_target",
        incomplete: false,
        actualValue: 40,
      }),
    ];
    const queue = buildPeopleQueue(scored, [
      { id: "a", name: "Ann", email: "", role: "employee", jobTitle: null, branchId: null, status: "active" },
      { id: "b", name: "Bob", email: "", role: "employee", jobTitle: null, branchId: null, status: "active" },
      { id: "c", name: "Cat", email: "", role: "employee", jobTitle: null, branchId: null, status: "active" },
    ]);
    expect(queue.map((p) => p.employeeId)).toEqual(["c", "b", "a"]);
  });
});
