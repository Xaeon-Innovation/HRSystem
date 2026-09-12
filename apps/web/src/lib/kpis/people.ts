import { overallPerformanceScore, scoreKpis } from "./scoring";
import type { EmployeeOption, ScoredKpi } from "./types";

export type PersonPulseStatus = "need_look" | "incomplete" | "on_track";

export type PersonPulse = {
  employeeId: string;
  name: string;
  jobTitle: string | null;
  avatarUrl?: string | null;
  overall: number | null;
  status: PersonPulseStatus;
  metricCount: number;
  riskCount: number;
  missingCount: number;
  waitingAckCount: number;
  metrics: ScoredKpi[];
};

export function buildPeopleQueue(
  scored: ScoredKpi[],
  employees: EmployeeOption[],
  focus?: "attention" | "on_track" | "missing" | "",
): PersonPulse[] {
  const byEmp = new Map<string, ScoredKpi[]>();
  for (const item of scored) {
    if (!item.employeeId) continue;
    const list = byEmp.get(item.employeeId) ?? [];
    list.push(item);
    byEmp.set(item.employeeId, list);
  }

  const empById = new Map(employees.map((e) => [e.id, e]));
  const rows: PersonPulse[] = [];

  for (const [employeeId, metrics] of byEmp) {
    const emp = empById.get(employeeId);
    const riskCount = metrics.filter(
      (m) => m.status === "below_target" || m.status === "at_risk",
    ).length;
    const missingCount = metrics.filter(
      (m) => m.status === "missing" || m.incomplete,
    ).length;
    const waitingAckCount = metrics.filter(
      (m) => m.latestScoreId && !m.acknowledgedAt && !m.incomplete,
    ).length;
    let status: PersonPulseStatus = "on_track";
    if (riskCount > 0) status = "need_look";
    else if (missingCount > 0) status = "incomplete";

    rows.push({
      employeeId,
      name: emp?.name ?? metrics[0]?.employeeName ?? "Unknown",
      jobTitle: emp?.jobTitle ?? null,
      avatarUrl: emp?.avatarUrl,
      overall: overallPerformanceScore(scoreKpis(metrics)),
      status,
      metricCount: metrics.length,
      riskCount,
      missingCount,
      waitingAckCount,
      metrics,
    });
  }

  const filtered = rows.filter((row) => {
    if (!focus) return true;
    if (focus === "attention") return row.status === "need_look";
    if (focus === "on_track") return row.status === "on_track";
    return row.missingCount > 0;
  });

  const rank: Record<PersonPulseStatus, number> = {
    need_look: 0,
    incomplete: 1,
    on_track: 2,
  };

  return filtered.sort((a, b) => {
    const byStatus = rank[a.status] - rank[b.status];
    if (byStatus !== 0) return byStatus;
    const ao = a.overall ?? -1;
    const bo = b.overall ?? -1;
    return ao - bo;
  });
}
