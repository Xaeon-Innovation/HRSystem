import { daysBetween, endOfMonth, monthKey, parseIsoDate, roundDays, startOfMonth, yearsOfService } from "./format.js";
import type { LeaveAccrualSettings, LeaveEmployee, LeavePolicy } from "./types.js";

export function monthlyAccrualAmount(
  settings: LeaveAccrualSettings,
  annualEntitlement: number,
  employee: LeaveEmployee,
  asOf: string,
): number {
  if (!settings.enabled) return 0;

  let monthly = settings.monthlyDays;
  if (settings.method === "annual_divided") {
    monthly = roundDays(annualEntitlement / 12);
  } else if (settings.method === "tenure_tiered") {
    const years = yearsOfService(employee.hireDate, asOf);
    const tiers = [...settings.tenureTiers].sort((a, b) => a.minYears - b.minYears);
    monthly = settings.monthlyDays;
    for (const tier of tiers) {
      if (years >= tier.minYears) monthly = tier.monthlyDays;
    }
  }

  if (settings.prorateNewHires && monthKey(employee.hireDate) === monthKey(asOf)) {
    const monthStart = startOfMonth(asOf);
    const monthEnd = endOfMonth(asOf);
    const start = employee.hireDate > monthStart ? employee.hireDate : monthStart;
    const eligible = daysBetween(start, monthEnd) + 1;
    const total = daysBetween(monthStart, monthEnd) + 1;
    return roundDays(monthly * (eligible / total));
  }

  return roundDays(monthly);
}

export function accrualPeriodKey(asOf: string, runDayOfMonth: number): string {
  const d = parseIsoDate(asOf);
  const day = Math.min(Math.max(runDayOfMonth, 1), 28);
  if (d.getDate() < day) {
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
  }
  return monthKey(asOf);
}

export function shouldPostAccrual(input: {
  lastAccrualAt: string | null;
  settings: LeaveAccrualSettings;
  asOf: string;
}): boolean {
  if (!input.settings.enabled) return false;
  const period = accrualPeriodKey(input.asOf, input.settings.runDayOfMonth);
  if (!input.lastAccrualAt) return true;
  return monthKey(input.lastAccrualAt) < period;
}

/** Posts monthly accrual conceptually, call from a scheduler or “Run accrual” admin action. */
export function planAccrualPosting(input: {
  employee: LeaveEmployee;
  policy: LeavePolicy;
  lastAccrualAt: string | null;
  asOf: string;
}): { amount: number; period: string } | null {
  if (!shouldPostAccrual({ lastAccrualAt: input.lastAccrualAt, settings: input.policy.accrual, asOf: input.asOf })) {
    return null;
  }
  const amount = monthlyAccrualAmount(
    input.policy.accrual,
    input.policy.annualEntitlement,
    input.employee,
    input.asOf,
  );
  if (amount <= 0) return null;
  return {
    amount,
    period: accrualPeriodKey(input.asOf, input.policy.accrual.runDayOfMonth),
  };
}
