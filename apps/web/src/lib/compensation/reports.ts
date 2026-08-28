import {
  approvedCycleVariable,
  bandInsight,
  daysUntil,
  findBandFor,
  recurringDeductions,
  toMonthlyEquivalent,
  totalCompensation,
} from "./calc";
import { monthKey, roundMoney } from "./format";
import type {
  BandPosition,
  ChangeRequest,
  CompEmployee,
  CompReport,
  CompensationRecord,
  CompComponent,
  OverviewSummary,
  PayrollPeriod,
  PeriodAdjustment,
  SalaryBand,
  SalaryHistoryEntry,
  VariablePay,
} from "./types";

const RECENT_DAYS = 90;

export function isRecent(isoDate: string, asOf: string, days = RECENT_DAYS): boolean {
  const t = new Date(`${isoDate.slice(0, 10)}T00:00:00`).getTime();
  const now = new Date(`${asOf.slice(0, 10)}T00:00:00`).getTime();
  return now - t >= 0 && now - t <= days * 86_400_000;
}

export function buildOverview(input: {
  employees: CompEmployee[];
  records: CompensationRecord[];
  components: CompComponent[];
  variable: VariablePay[];
  requests: ChangeRequest[];
  history: SalaryHistoryEntry[];
  bands: SalaryBand[];
  adjustments?: PeriodAdjustment[];
  period: PayrollPeriod;
  asOf: string;
}): OverviewSummary {
  const { employees, records, components, variable, requests, history, bands, adjustments, period, asOf } =
    input;
  const recByEmp = new Map(records.map((r) => [r.employeeId, r]));
  const adjByEmp = new Map((adjustments ?? []).map((a) => [a.employeeId, a]));
  const active = employees.filter((e) => e.status === "active");

  let monthlyLiability = 0;
  let deductionsThisCycle = 0;
  let outOfBandCount = 0;
  const dept = new Map<string, { sum: number; n: number }>();
  const role = new Map<string, { sum: number; n: number }>();
  const currency = records[0]?.currency ?? "EGP";

  for (const emp of active) {
    const rec = recByEmp.get(emp.id);
    if (!rec || rec.status === "inactive") continue;
    const monthly = toMonthlyEquivalent(rec);
    const comps = components.filter((c) => c.employeeId === emp.id);
    const total = totalCompensation(
      rec,
      comps,
      variable,
      period.start,
      period.end,
      adjByEmp.get(emp.id) ?? null,
    );
    monthlyLiability += total;
    deductionsThisCycle += recurringDeductions(comps, monthly, period.end);
    const insight = bandInsight(monthly, findBandFor(bands, rec.gradeId, emp.role));
    if (insight.position === "below" || insight.position === "above") outOfBandCount += 1;
    const d = dept.get(emp.department) ?? { sum: 0, n: 0 };
    d.sum += monthly;
    d.n += 1;
    dept.set(emp.department, d);
    const r = role.get(emp.role) ?? { sum: 0, n: 0 };
    r.sum += monthly;
    r.n += 1;
    role.set(emp.role, r);
  }

  let bonusesThisCycle = 0;
  let commissionsThisCycle = 0;
  for (const emp of active) {
    const v = approvedCycleVariable(variable, emp.id, period.start, period.end);
    bonusesThisCycle += v.bonuses;
    commissionsThisCycle += v.commissions;
  }

  return {
    monthlyLiability: roundMoney(monthlyLiability),
    bonusesThisCycle: roundMoney(bonusesThisCycle),
    commissionsThisCycle: roundMoney(commissionsThisCycle),
    pendingApprovals: requests.filter((r) => r.status === "pending").length,
    recentChangeCount: history.filter((h) => isRecent(h.effectiveDate, asOf)).length,
    outOfBandCount,
    upcomingCutoff: period.cutoff,
    daysToCutoff: daysUntil(period.cutoff, asOf),
    deductionsThisCycle: roundMoney(deductionsThisCycle),
    currency,
    employeeCount: active.length,
    avgByDepartment: [...dept.entries()]
      .map(([department, v]) => ({
        department,
        average: roundMoney(v.sum / v.n),
        headcount: v.n,
      }))
      .sort((a, b) => b.average - a.average),
    avgByRole: [...role.entries()]
      .map(([roleName, v]) => ({
        role: roleName,
        average: roundMoney(v.sum / v.n),
        headcount: v.n,
      }))
      .sort((a, b) => b.average - a.average),
  };
}

function groupSum(
  rows: { label: string; amount: number }[],
): { label: string; amount: number; people: number }[] {
  const map = new Map<string, { amount: number; people: number }>();
  for (const row of rows) {
    const cur = map.get(row.label) ?? { amount: 0, people: 0 };
    cur.amount += row.amount;
    cur.people += 1;
    map.set(row.label, cur);
  }
  return [...map.entries()]
    .map(([label, v]) => ({ label, amount: roundMoney(v.amount), people: v.people }))
    .sort((a, b) => b.amount - a.amount);
}

export function buildReport(input: {
  employees: CompEmployee[];
  records: CompensationRecord[];
  components: CompComponent[];
  variable: VariablePay[];
  requests: ChangeRequest[];
  history: SalaryHistoryEntry[];
  bands: SalaryBand[];
  adjustments?: PeriodAdjustment[];
  period: PayrollPeriod;
  asOf: string;
}): CompReport {
  const { employees, records, components, variable, requests, history, bands, adjustments, period, asOf } =
    input;
  const recByEmp = new Map(records.map((r) => [r.employeeId, r]));
  const adjByEmp = new Map((adjustments ?? []).map((a) => [a.employeeId, a]));
  const deptRows: { label: string; amount: number }[] = [];
  const roleRows: { label: string; amount: number }[] = [];
  const branchAcc = new Map<string, { sum: number; n: number }>();
  const outOfBand: CompReport["outOfBand"] = [];

  for (const emp of employees.filter((e) => e.status === "active")) {
    const rec = recByEmp.get(emp.id);
    if (!rec) continue;
    const monthly = toMonthlyEquivalent(rec);
    const total = totalCompensation(
      rec,
      components.filter((c) => c.employeeId === emp.id),
      variable,
      period.start,
      period.end,
      adjByEmp.get(emp.id) ?? null,
    );
    deptRows.push({ label: emp.department, amount: total });
    roleRows.push({ label: emp.role, amount: monthly });
    const b = branchAcc.get(emp.branchName) ?? { sum: 0, n: 0 };
    b.sum += monthly;
    b.n += 1;
    branchAcc.set(emp.branchName, b);
    const pos = bandInsight(monthly, findBandFor(bands, rec.gradeId, emp.role)).position;
    if (pos === "below" || pos === "above") {
      outOfBand.push({
        employeeId: emp.id,
        name: emp.name,
        role: emp.role,
        monthly,
        position: pos as BandPosition,
      });
    }
  }

  const monthTotals = new Map<string, number>();
  for (const h of history) {
    const key = monthKey(h.effectiveDate);
    if (h.changeType === "hire_salary") {
      monthTotals.set(key, (monthTotals.get(key) ?? 0) + h.newAmount);
    } else {
      monthTotals.set(key, (monthTotals.get(key) ?? 0) + h.changeAmount);
    }
  }
  const growth = [...monthTotals.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([month, amount]) => ({ month, amount: roundMoney(amount) }));

  let totalBonuses = 0;
  let totalCommissions = 0;
  for (const emp of employees) {
    const v = approvedCycleVariable(variable, emp.id, period.start, period.end);
    totalBonuses += v.bonuses;
    totalCommissions += v.commissions;
  }

  return {
    byDepartment: groupSum(deptRows),
    byRole: groupSum(roleRows),
    byBranch: [...branchAcc.entries()]
      .map(([label, v]) => ({
        label,
        average: roundMoney(v.sum / v.n),
        people: v.n,
      }))
      .sort((a, b) => b.average - a.average),
    growth,
    outOfBand,
    pendingApprovals: requests.filter((r) => r.status === "pending").length,
    totalBonuses: roundMoney(totalBonuses),
    totalCommissions: roundMoney(totalCommissions),
    recentChanges: [...history]
      .filter((h) => isRecent(h.effectiveDate, asOf))
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate)),
    costByTeam: groupSum(deptRows).map((r) => ({ label: r.label, amount: r.amount })),
  };
}
