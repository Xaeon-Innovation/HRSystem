import { daysBetween, roundMoney } from "./format";
import { OT_MULTIPLIER } from "./hours";
import {
  DEDUCTION_KINDS,
  EARNING_KINDS,
  type BandInsight,
  type BandPosition,
  type CompComponent,
  type CompensationRecord,
  type PayslipBreakdown,
  type PayslipLine,
  type PeriodAdjustment,
  type SalaryBand,
  type VariablePay,
} from "./types";
import { t } from "@/i18n";

export function toMonthlyEquivalent(record: Pick<
  CompensationRecord,
  "payStructure" | "baseAmount" | "hoursPerWeek" | "workingDaysPerMonth"
>): number {
  const days = record.workingDaysPerMonth || 22;
  const hours = record.hoursPerWeek || 40;
  switch (record.payStructure) {
    case "weekly":
      return roundMoney((record.baseAmount * 52) / 12);
    case "daily":
      return roundMoney(record.baseAmount * days);
    case "hourly":
      return roundMoney((record.baseAmount * hours * 52) / 12);
    case "commission_only":
      return 0;
    default:
      return roundMoney(record.baseAmount);
  }
}

export function dailyRate(record: Pick<
  CompensationRecord,
  "payStructure" | "baseAmount" | "hoursPerWeek" | "workingDaysPerMonth"
>): number {
  const monthly = toMonthlyEquivalent(record);
  const days = record.workingDaysPerMonth || 22;
  return days > 0 ? roundMoney(monthly / days) : 0;
}

export function overtimeHourlyRate(record: Pick<
  CompensationRecord,
  "payStructure" | "baseAmount" | "hoursPerWeek" | "workingDaysPerMonth"
>): number {
  if (record.payStructure === "hourly") return roundMoney(record.baseAmount * 1.5);
  const hours = record.hoursPerWeek || 40;
  const monthly = toMonthlyEquivalent(record);
  const hourly = hours > 0 ? monthly / ((hours * 52) / 12) : 0;
  return roundMoney(hourly * 1.5);
}

export function isEarning(kind: CompComponent["kind"]): boolean {
  return EARNING_KINDS.includes(kind);
}

export function isDeduction(kind: CompComponent["kind"]): boolean {
  return DEDUCTION_KINDS.includes(kind);
}

export function isComponentActive(
  component: CompComponent,
  asOf: string,
): boolean {
  if (component.status === "ended" || component.status === "pending") return false;
  if (component.effectiveFrom > asOf) return false;
  if (component.effectiveTo && component.effectiveTo < asOf) return false;
  return true;
}

export function componentMonthlyAmount(
  component: CompComponent,
  baseMonthly: number,
): number {
  if (component.amountType === "percent_of_base") {
    return roundMoney((baseMonthly * component.amount) / 100);
  }
  return roundMoney(component.amount);
}

export function recurringAllowances(
  components: CompComponent[],
  baseMonthly: number,
  asOf: string,
): number {
  return roundMoney(
    components
      .filter(
        (c) =>
          isComponentActive(c, asOf) &&
          c.recurring &&
          isEarning(c.kind) &&
          c.kind !== "base_salary" &&
          c.kind !== "overtime" &&
          c.kind !== "bonus" &&
          c.kind !== "commission",
      )
      .reduce((sum, c) => sum + componentMonthlyAmount(c, baseMonthly), 0),
  );
}

export function recurringDeductions(
  components: CompComponent[],
  baseMonthly: number,
  asOf: string,
): number {
  return roundMoney(
    components
      .filter(
        (c) =>
          isComponentActive(c, asOf) &&
          c.recurring &&
          isDeduction(c.kind) &&
          c.kind !== "unpaid_leave" &&
          c.kind !== "absence",
      )
      .reduce((sum, c) => sum + componentMonthlyAmount(c, baseMonthly), 0),
  );
}

export function approvedCycleVariable(
  items: VariablePay[],
  employeeId: string,
  periodStart: string,
  periodEnd: string,
): { bonuses: number; commissions: number } {
  let bonuses = 0;
  let commissions = 0;
  for (const v of items) {
    if (v.employeeId !== employeeId) continue;
    if (v.status !== "approved" && v.status !== "paid") continue;
    const overlaps = v.payoutPeriodStart <= periodEnd && v.payoutPeriodEnd >= periodStart;
    if (!overlaps) continue;
    if (v.kind === "bonus") bonuses += v.amount;
    else commissions += v.amount;
  }
  return { bonuses: roundMoney(bonuses), commissions: roundMoney(commissions) };
}

export function bandInsight(monthly: number, band: SalaryBand | null): BandInsight {
  if (!band) {
    return {
      band: null,
      monthly,
      position: null,
      compaRatio: null,
      percentThroughBand: null,
    };
  }
  let position: BandPosition = "in_band";
  if (monthly < band.min) position = "below";
  else if (monthly > band.max) position = "above";
  const span = band.max - band.min;
  const percentThroughBand =
    span <= 0 ? null : roundMoney(((monthly - band.min) / span) * 100);
  const compaRatio = band.midpoint > 0 ? roundMoney(monthly / band.midpoint) : null;
  return { band, monthly, position, compaRatio, percentThroughBand };
}

export function findBandFor(
  bands: SalaryBand[],
  gradeId: string | null,
  role: string,
): SalaryBand | null {
  if (gradeId) {
    const byId = bands.find((b) => b.id === gradeId);
    if (byId) return byId;
  }
  const byRole = bands.find((b) => b.role.toLowerCase() === role.toLowerCase());
  return byRole ?? null;
}

export function changeDelta(previous: number, next: number): {
  changeAmount: number;
  changePercent: number | null;
} {
  const changeAmount = roundMoney(next - previous);
  const changePercent =
    previous === 0 ? null : roundMoney((changeAmount / previous) * 100);
  return { changeAmount, changePercent };
}

export function periodBasePay(
  record: Pick<
    CompensationRecord,
    "payStructure" | "baseAmount" | "hoursPerWeek" | "workingDaysPerMonth"
  >,
  adjustment?: PeriodAdjustment | null,
): number {
  if (record.payStructure === "hourly") {
    return roundMoney(record.baseAmount * (adjustment?.regularHours ?? 0));
  }
  return toMonthlyEquivalent(record);
}

export function buildPayslip(input: {
  record: CompensationRecord;
  components: CompComponent[];
  variable: VariablePay[];
  adjustment?: PeriodAdjustment | null;
  periodStart: string;
  periodEnd: string;
}): PayslipBreakdown {
  const { record, components, variable, adjustment, periodStart, periodEnd } = input;
  const asOf = periodEnd;
  const hourly = record.payStructure === "hourly";
  const regularHours = adjustment?.regularHours ?? 0;
  const otHours = adjustment?.overtimeHours ?? 0;
  const base = periodBasePay(record, adjustment);
  const lines: PayslipLine[] = [];

  if (hourly || base > 0) {
    lines.push({
      kind: "base_salary",
      label: hourly
        ? `Hourly pay (${regularHours.toFixed(1)}h × ${record.baseAmount})`
        : "Base pay",
      side: "earning",
      amount: base,
    });
  }

  for (const c of components.filter(
    (x) =>
      isComponentActive(x, asOf) &&
      isEarning(x.kind) &&
      x.kind !== "base_salary" &&
      x.kind !== "overtime" &&
      x.kind !== "bonus" &&
      x.kind !== "commission",
  )) {
    lines.push({
      kind: c.kind,
      label: c.label,
      side: "earning",
      amount: componentMonthlyAmount(c, base),
    });
  }

  const overtime =
    otHours > 0
      ? roundMoney(
          hourly
            ? record.baseAmount * OT_MULTIPLIER * otHours
            : otHours * overtimeHourlyRate(record),
        )
      : 0;
  if (overtime > 0) {
    lines.push({
      kind: "overtime",
      label: `Overtime (${otHours}h)`,
      side: "earning",
      amount: overtime,
    });
  }

  const cycleVar = approvedCycleVariable(variable, record.employeeId, periodStart, periodEnd);
  if (cycleVar.bonuses > 0) {
    lines.push({
      kind: "bonus",
      label: t("Bonus / incentive"),
      side: "earning",
      amount: cycleVar.bonuses,
    });
  }
  if (cycleVar.commissions > 0) {
    lines.push({
      kind: "commission",
      label: t("Commission"),
      side: "earning",
      amount: cycleVar.commissions,
    });
  }

  if ((adjustment?.manualAdjustment ?? 0) > 0) {
    lines.push({
      kind: "manual_adjustment",
      label: adjustment?.manualNote || "Manual adjustment",
      side: "earning",
      amount: adjustment!.manualAdjustment,
    });
  }

  for (const c of components.filter(
    (x) =>
      isComponentActive(x, asOf) &&
      isDeduction(x.kind) &&
      x.kind !== "unpaid_leave" &&
      x.kind !== "absence",
  )) {
    lines.push({
      kind: c.kind,
      label: c.label,
      side: "deduction",
      amount: componentMonthlyAmount(c, base),
    });
  }

  const unpaidDays = adjustment?.unpaidLeaveDays ?? 0;
  const unpaid = unpaidDays > 0 ? roundMoney(dailyRate(record) * unpaidDays) : 0;
  if (unpaid > 0) {
    lines.push({
      kind: "unpaid_leave",
      label: `Unpaid leave (${unpaidDays}d)`,
      side: "deduction",
      amount: unpaid,
    });
  }

  const absenceDays = adjustment?.absenceDays ?? 0;
  const absence = absenceDays > 0 ? roundMoney(dailyRate(record) * absenceDays) : 0;
  if (absence > 0) {
    lines.push({
      kind: "absence",
      label: `Absence (${absenceDays}d)`,
      side: "deduction",
      amount: absence,
    });
  }

  const attendance = adjustment?.attendancePenalty ?? 0;
  if (attendance > 0) {
    lines.push({
      kind: "penalty",
      label: t("Attendance impact"),
      side: "deduction",
      amount: attendance,
    });
  }

  if ((adjustment?.manualAdjustment ?? 0) < 0) {
    lines.push({
      kind: "manual_adjustment",
      label: adjustment?.manualNote || "Manual adjustment",
      side: "deduction",
      amount: Math.abs(adjustment!.manualAdjustment),
    });
  }

  const allowances = roundMoney(
    lines
      .filter(
        (l) =>
          l.side === "earning" &&
          l.kind !== "base_salary" &&
          l.kind !== "bonus" &&
          l.kind !== "commission" &&
          l.kind !== "overtime" &&
          l.kind !== "manual_adjustment",
      )
      .reduce((s, l) => s + l.amount, 0),
  );
  const incentives = roundMoney(cycleVar.bonuses + cycleVar.commissions);
  const gross = roundMoney(lines.filter((l) => l.side === "earning").reduce((s, l) => s + l.amount, 0));
  const deductions = roundMoney(
    lines.filter((l) => l.side === "deduction").reduce((s, l) => s + l.amount, 0),
  );

  return {
    currency: record.currency,
    base,
    allowances,
    incentives,
    overtime,
    gross,
    deductions,
    net: roundMoney(gross - deductions),
    lines,
    regularHours: hourly || (adjustment?.workedHours ?? 0) > 0 ? regularHours : null,
    overtimeHours: otHours > 0 ? otHours : hourly ? 0 : null,
    workedHours:
      hourly || (adjustment?.workedHours ?? 0) > 0
        ? adjustment?.workedHours ?? roundMoney(regularHours + otHours)
        : null,
    hourlyRate: hourly ? record.baseAmount : null,
  };
}

export function totalCompensation(
  record: CompensationRecord,
  components: CompComponent[],
  variable: VariablePay[],
  periodStart: string,
  periodEnd: string,
  adjustment?: PeriodAdjustment | null,
): number {
  const base = periodBasePay(record, adjustment);
  const allow = recurringAllowances(components, base, periodEnd);
  const deduct = recurringDeductions(components, base, periodEnd);
  const v = approvedCycleVariable(variable, record.employeeId, periodStart, periodEnd);
  const ot =
    record.payStructure === "hourly"
      ? roundMoney(record.baseAmount * OT_MULTIPLIER * (adjustment?.overtimeHours ?? 0))
      : 0;
  return roundMoney(base + allow - deduct + v.bonuses + v.commissions + ot);
}

export function daysUntil(target: string, asOf: string): number {
  return daysBetween(asOf, target);
}
