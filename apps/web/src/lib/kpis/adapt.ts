import { achievementPercent, overallPerformanceScore, scoreKpis, trendFromHistory } from "./scoring";
import { inRange } from "./period";
import {
  departmentForRole,
  inferRoleTemplate,
  matchTemplateKpi,
  templateById,
} from "./templates";
import type {
  ApiSummaryItem,
  BenchmarkSet,
  EmployeeOption,
  KpiFilters,
  KpiHistoryPoint,
  KpiItem,
  PeriodWindow,
  ReviewCycle,
  RoleTemplateId,
  ScoredKpi,
} from "./types";

function asCycle(value: string | null | undefined): ReviewCycle {
  if (value === "quarterly" || value === "yearly") return value;
  return "monthly";
}

function latestInWindow(
  history: KpiHistoryPoint[],
  from: string,
  to: string,
): KpiHistoryPoint | null {
  return (
    history.find((h) => inRange(h.reviewDate, from, to)) ?? null
  );
}

function historyFromScores(
  item: ApiSummaryItem,
  targetValue: number | null,
): KpiHistoryPoint[] {
  return (item.scores ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.reviewDate).getTime() - new Date(a.reviewDate).getTime(),
    )
    .map((score, index) => ({
      period: `Review ${item.scores.length - index}`,
      actualValue: score.score,
      targetValue,
      reviewDate: score.reviewDate,
      notes: score.notes,
    }));
}

export function adaptSummaryItem(
  item: ApiSummaryItem,
  employees: EmployeeOption[],
  period: PeriodWindow,
): KpiItem | null {
  const kpi = item.kpi;
  if (!kpi) return null;
  const employee = employees.find((e) => e.id === item.assignment.employeeId);
  const inferredRole = inferRoleTemplate(
    employee?.jobTitle,
    employee?.jobRoles?.map((r) => r.name),
  );
  const matched = matchTemplateKpi(kpi.name, inferredRole) ?? matchTemplateKpi(kpi.name);
  const template = matched?.kpi;
  const roleScope = matched?.template.id ?? inferredRole;
  const targetValue = kpi.targetValue ?? template?.targetValue ?? null;
  const history = historyFromScores(item, targetValue);
  const current = latestInWindow(history, period.from, period.to) ?? history[0] ?? null;
  const previous =
    latestInWindow(history, period.previousFrom, period.previousTo) ??
    history[1] ??
    null;
  const currentAchievement = achievementPercent(
    current?.actualValue ?? null,
    targetValue,
    template?.direction ?? "higher",
  );
  const previousAchievement = achievementPercent(
    previous?.actualValue ?? null,
    targetValue,
    template?.direction ?? "higher",
  );
  const { trend, delta } = trendFromHistory(currentAchievement, previousAchievement);
  const notes = current?.notes ?? history[0]?.notes ?? kpi.description ?? null;
  const evidence = history
    .filter((h) => h.notes)
    .slice(0, 4)
    .map((h, i) => ({
      id: `${item.assignment.id}-ev-${i}`,
      label: h.notes ? "Review note" : "Score record",
      source: template?.source ?? "KPI review",
      recordedAt: h.reviewDate,
      notes: h.notes,
    }));

  return {
    id: item.assignment.id,
    templateKey: template?.key,
    assignmentId: item.assignment.id,
    kpiDefinitionId: kpi.id,
    employeeId: item.assignment.employeeId ?? null,
    employeeName: employee?.name,
    title: kpi.name,
    category: template?.category ?? "goal_execution",
    roleScope,
    description: kpi.description || template?.description || `${kpi.name} performance versus target.`,
    targetValue,
    actualValue: current?.actualValue ?? null,
    unit: template?.unit ?? "score",
    weight: template?.weight ?? 10,
    period: asCycle(kpi.reviewPeriod) || template?.period || "monthly",
    trend,
    trendDelta: delta,
    threshold: template?.threshold ?? {
      minAcceptablePercent: 80,
      atRiskPercent: 90,
      optionalCap: 120,
    },
    status: "missing",
    owner: template?.owner ?? employee?.name ?? "Direct manager",
    source: template?.source ?? "KPI review",
    notes,
    evidence,
    history,
    direction: template?.direction ?? "higher",
    lastUpdated: current?.reviewDate ?? history[0]?.reviewDate ?? null,
    dueAt: item.assignment.dueAt,
    formula:
      template?.formula ??
      "achievementPercent = actualValue / targetValue × 100; weightedScore = min(achievementPercent, cap) × weight; overall = sum(weightedScore) / sum(weights)",
  };
}

export function adaptSummary(
  summary: ApiSummaryItem[],
  employees: EmployeeOption[],
  period: PeriodWindow,
): KpiItem[] {
  return summary
    .map((item) => adaptSummaryItem(item, employees, period))
    .filter((item): item is KpiItem => item != null);
}

export function filterKpis(
  items: KpiItem[],
  employees: EmployeeOption[],
  filters: KpiFilters,
): KpiItem[] {
  const employeeById = new Map(employees.map((e) => [e.id, e]));
  return items.filter((item) => {
    if (filters.employeeId && item.employeeId !== filters.employeeId) return false;
    if (filters.role && item.roleScope !== filters.role) return false;
    if (filters.category && item.category !== filters.category) return false;
    if (filters.branchId || filters.department || filters.manager) {
      const emp = item.employeeId ? employeeById.get(item.employeeId) : undefined;
      if (filters.branchId && emp?.branchId !== filters.branchId) return false;
      if (filters.department) {
        const dept = departmentForRole(
          inferRoleTemplate(emp?.jobTitle, emp?.jobRoles?.map((r) => r.name)),
        );
        if (dept !== filters.department) return false;
      }
      if (filters.manager) {
        const ownerMatch = item.owner.toLowerCase().includes(filters.manager.toLowerCase());
        if (!ownerMatch) return false;
      }
    }
    return true;
  });
}

export function employeeOverallMap(
  items: KpiItem[],
): Map<string, number> {
  const grouped = new Map<string, KpiItem[]>();
  for (const item of items) {
    if (!item.employeeId) continue;
    const list = grouped.get(item.employeeId) ?? [];
    list.push(item);
    grouped.set(item.employeeId, list);
  }
  const scores = new Map<string, number>();
  for (const [id, list] of grouped) {
    const scored = scoreKpis(list);
    const overall = overallPerformanceScore(scored);
    if (overall != null) scores.set(id, overall);
  }
  return scores;
}

export function previousPeriodItems(items: KpiItem[]): KpiItem[] {
  return items.map((item) => ({
    ...item,
    actualValue: item.history[1]?.actualValue ?? null,
    lastUpdated: item.history[1]?.reviewDate ?? null,
  }));
}

export function computeBenchmarks(
  selected: ScoredKpi[],
  allItems: KpiItem[],
  employees: EmployeeOption[],
  selectedEmployeeId: string,
  role: RoleTemplateId | "",
): BenchmarkSet {
  const selectedOverall = overallPerformanceScore(selected);
  const byEmployee = employeeOverallMap(allItems);
  const companyValues = [...byEmployee.values()].sort((a, b) => a - b);
  const avg = (values: number[]) =>
    values.length ? values.reduce((s, n) => s + n, 0) / values.length : null;

  const companyAverage = avg(companyValues);
  const inferredRole =
    role ||
    (selectedEmployeeId
      ? inferRoleTemplate(
          employees.find((e) => e.id === selectedEmployeeId)?.jobTitle,
          employees
            .find((e) => e.id === selectedEmployeeId)
            ?.jobRoles?.map((r) => r.name),
        )
      : selected[0]?.roleScope ?? "");
  const roleValues = inferredRole
    ? [...byEmployee.entries()]
        .filter(([id]) => {
          const emp = employees.find((e) => e.id === id);
          return (
            inferRoleTemplate(
              emp?.jobTitle,
              emp?.jobRoles?.map((r) => r.name),
            ) === inferredRole
          );
        })
        .map(([, v]) => v)
    : [];
  const department = inferredRole
    ? departmentForRole(inferredRole as RoleTemplateId)
    : "";
  const deptValues = department
    ? [...byEmployee.entries()]
        .filter(([id]) => {
          const emp = employees.find((e) => e.id === id);
          return (
            departmentForRole(
              inferRoleTemplate(
                emp?.jobTitle,
                emp?.jobRoles?.map((r) => r.name),
              ),
            ) === department
          );
        })
        .map(([, v]) => v)
    : [];

  let percentile: number | null = null;
  let rank: number | null = null;
  const subjectScore = selectedEmployeeId
    ? byEmployee.get(selectedEmployeeId)
    : selectedOverall;
  if (subjectScore != null && companyValues.length > 0) {
    const below = companyValues.filter((v) => v < subjectScore).length;
    percentile = (below / companyValues.length) * 100;
    const desc = [...companyValues].sort((a, b) => b - a);
    rank = desc.indexOf(subjectScore) + 1;
  }

  return {
    previousPeriod: overallPerformanceScore(scoreKpis(previousPeriodItems(selected))),
    teamAverage: companyAverage,
    departmentAverage: avg(deptValues),
    companyAverage,
    roleAverage: avg(roleValues),
    percentile,
    rank,
    cohortSize: companyValues.length,
  };
}

export { templateById };
