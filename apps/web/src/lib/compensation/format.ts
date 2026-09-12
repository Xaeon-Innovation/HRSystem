import type {
  AppraisalResult,
  BandPosition,
  BonusType,
  ChangeRequestStatus,
  ChangeType,
  CompStatus,
  ComponentKind,
  EmploymentType,
  PayFrequency,
  PayStructure,
  VariableCycle,
  VariableStatus,
} from "./types";
import { t, intlDateOptions, intlLocale, intlNumberOptions } from "@/i18n";

export const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const TEXTAREA_CLASS =
  "min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
}

export function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayIso(now = new Date()): string {
  return toIsoDate(now);
}

export function addDaysIso(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

export function daysBetween(from: string, to: string): number {
  const a = parseIsoDate(from).getTime();
  const b = parseIsoDate(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = parseIsoDate(value.slice(0, 10));
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(
    intlLocale(),
    intlDateOptions({ month: "short", day: "numeric", year: "numeric" }),
  );
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(
    intlLocale(),
    intlDateOptions({
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  );
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function formatMoney(
  value: number | null | undefined,
  currency = "EGP",
  opts?: { compact?: boolean },
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (opts?.compact && Math.abs(value) >= 1000) {
    const k = value / 1000;
    const n = Math.abs(k) >= 10 ? k.toFixed(0) : k.toFixed(1);
    return `${n}k ${currency}`;
  }
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    currencyDisplay: "code",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatCompa(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}x`;
}

export function formatHours(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(digits)}h`;
}

export function payStructureLabel(value: PayStructure): string {
  switch (value) {
    case "monthly":
      return t("Monthly salary");
    case "weekly":
      return t("Weekly salary");
    case "daily":
      return t("Daily wage");
    case "hourly":
      return t("Hourly rate");
    case "commission_only":
      return t("Commission only");
    case "salary_plus_commission":
      return t("Salary + commission");
    case "salary_plus_bonus":
      return t("Salary + bonus");
    case "hybrid":
      return t("Custom hybrid");
  }
}

export function payFrequencyLabel(value: PayFrequency): string {
  switch (value) {
    case "monthly":
      return t("Monthly");
    case "biweekly":
      return t("Biweekly");
    case "weekly":
      return t("Weekly");
    case "daily":
      return t("Daily");
  }
}

export function employmentTypeLabel(value: EmploymentType): string {
  switch (value) {
    case "full_time":
      return t("Full time");
    case "part_time":
      return t("Part time");
    case "contract":
      return t("Contract");
    case "intern":
      return t("Intern");
  }
}

export function compStatusLabel(value: CompStatus): string {
  switch (value) {
    case "active":
      return t("Active");
    case "pending_change":
      return t("Pending change");
    case "frozen":
      return t("Frozen");
    case "inactive":
      return t("Inactive");
  }
}

export function changeTypeLabel(value: ChangeType): string {
  switch (value) {
    case "hire_salary":
      return t("Hire salary");
    case "promotion_increase":
      return t("Promotion increase");
    case "merit_increase":
      return t("Merit increase");
    case "adjustment":
      return t("Adjustment / correction");
    case "market_adjustment":
      return t("Market adjustment");
    case "bonus_payout":
      return t("Bonus payout");
    case "commission_payout":
      return t("Commission payout");
    case "temporary_allowance":
      return t("Temporary allowance");
    case "deduction_setup":
      return t("Deduction setup");
    case "salary_freeze":
      return t("Salary freeze");
    case "salary_reduction":
      return t("Salary reduction");
    case "transfer_related":
      return t("Transfer-related");
  }
}

export function changeStatusLabel(value: ChangeRequestStatus): string {
  switch (value) {
    case "draft":
      return t("Draft");
    case "pending":
      return t("Pending");
    case "approved":
      return t("Approved");
    case "rejected":
      return t("Rejected");
    case "returned":
      return t("Returned");
  }
}

export function componentKindLabel(value: ComponentKind): string {
  switch (value) {
    case "base_salary":
      return t("Base salary");
    case "housing_allowance":
      return t("Housing allowance");
    case "transport_allowance":
      return t("Transport allowance");
    case "meal_allowance":
      return t("Meal allowance");
    case "mobile_allowance":
      return t("Mobile allowance");
    case "overtime":
      return t("Overtime");
    case "bonus":
      return t("Bonus");
    case "commission":
      return t("Commission");
    case "custom_earning":
      return t("Custom earning");
    case "advance_loan":
      return t("Advance / loan");
    case "penalty":
      return t("Penalty / fine");
    case "absence":
      return t("Absence deduction");
    case "unpaid_leave":
      return t("Unpaid leave");
    case "insurance_placeholder":
      return t("Insurance (placeholder)");
    case "tax_placeholder":
      return t("Tax (placeholder)");
    case "custom_deduction":
      return t("Custom deduction");
  }
}

export function bonusTypeLabel(value: BonusType): string {
  switch (value) {
    case "annual":
      return t("Annual bonus");
    case "quarterly":
      return t("Quarterly bonus");
    case "spot":
      return t("Spot bonus");
    case "signing":
      return t("Signing bonus");
    case "retention":
      return t("Retention bonus");
    case "kpi_incentive":
      return t("KPI incentive");
  }
}

export function variableCycleLabel(value: VariableCycle): string {
  switch (value) {
    case "monthly":
      return t("Monthly");
    case "quarterly":
      return t("Quarterly");
    case "annual":
      return t("Annual");
    case "one_off":
      return t("One-off");
  }
}

export function variableStatusLabel(value: VariableStatus): string {
  switch (value) {
    case "draft":
      return t("Draft");
    case "pending":
      return t("Pending");
    case "approved":
      return t("Approved");
    case "paid":
      return t("Paid");
    case "rejected":
      return t("Rejected");
  }
}

export function bandPositionLabel(value: BandPosition): string {
  switch (value) {
    case "below":
      return t("Below band");
    case "in_band":
      return t("In band");
    case "above":
      return t("Above band");
  }
}

export function appraisalLabel(value: AppraisalResult | null | undefined): string {
  switch (value) {
    case "exceeds":
      return t("Exceeds");
    case "meets":
      return t("Meets");
    case "developing":
      return t("Developing");
    case "below":
      return t("Below");
    default:
      return "—";
  }
}

export function rateUnit(structure: PayStructure): string {
  switch (structure) {
    case "hourly":
      return "/hr";
    case "daily":
      return "/day";
    case "weekly":
      return "/wk";
    default:
      return "/mo";
  }
}

export function employeeCodeFrom(id: string, name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
  const tail = id.replace(/[^a-z0-9]/gi, "").slice(-4).toUpperCase();
  return `EMP-${initials}${tail}`;
}
