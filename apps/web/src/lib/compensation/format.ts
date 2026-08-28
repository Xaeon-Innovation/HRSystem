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
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
      return "Monthly salary";
    case "weekly":
      return "Weekly salary";
    case "daily":
      return "Daily wage";
    case "hourly":
      return "Hourly rate";
    case "commission_only":
      return "Commission only";
    case "salary_plus_commission":
      return "Salary + commission";
    case "salary_plus_bonus":
      return "Salary + bonus";
    case "hybrid":
      return "Custom hybrid";
  }
}

export function payFrequencyLabel(value: PayFrequency): string {
  switch (value) {
    case "monthly":
      return "Monthly";
    case "biweekly":
      return "Biweekly";
    case "weekly":
      return "Weekly";
    case "daily":
      return "Daily";
  }
}

export function employmentTypeLabel(value: EmploymentType): string {
  switch (value) {
    case "full_time":
      return "Full time";
    case "part_time":
      return "Part time";
    case "contract":
      return "Contract";
    case "intern":
      return "Intern";
  }
}

export function compStatusLabel(value: CompStatus): string {
  switch (value) {
    case "active":
      return "Active";
    case "pending_change":
      return "Pending change";
    case "frozen":
      return "Frozen";
    case "inactive":
      return "Inactive";
  }
}

export function changeTypeLabel(value: ChangeType): string {
  switch (value) {
    case "hire_salary":
      return "Hire salary";
    case "promotion_increase":
      return "Promotion increase";
    case "merit_increase":
      return "Merit increase";
    case "adjustment":
      return "Adjustment / correction";
    case "market_adjustment":
      return "Market adjustment";
    case "bonus_payout":
      return "Bonus payout";
    case "commission_payout":
      return "Commission payout";
    case "temporary_allowance":
      return "Temporary allowance";
    case "deduction_setup":
      return "Deduction setup";
    case "salary_freeze":
      return "Salary freeze";
    case "salary_reduction":
      return "Salary reduction";
    case "transfer_related":
      return "Transfer-related";
  }
}

export function changeStatusLabel(value: ChangeRequestStatus): string {
  switch (value) {
    case "draft":
      return "Draft";
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "returned":
      return "Returned";
  }
}

export function componentKindLabel(value: ComponentKind): string {
  switch (value) {
    case "base_salary":
      return "Base salary";
    case "housing_allowance":
      return "Housing allowance";
    case "transport_allowance":
      return "Transport allowance";
    case "meal_allowance":
      return "Meal allowance";
    case "mobile_allowance":
      return "Mobile allowance";
    case "overtime":
      return "Overtime";
    case "bonus":
      return "Bonus";
    case "commission":
      return "Commission";
    case "custom_earning":
      return "Custom earning";
    case "advance_loan":
      return "Advance / loan";
    case "penalty":
      return "Penalty / fine";
    case "absence":
      return "Absence deduction";
    case "unpaid_leave":
      return "Unpaid leave";
    case "insurance_placeholder":
      return "Insurance (placeholder)";
    case "tax_placeholder":
      return "Tax (placeholder)";
    case "custom_deduction":
      return "Custom deduction";
  }
}

export function bonusTypeLabel(value: BonusType): string {
  switch (value) {
    case "annual":
      return "Annual bonus";
    case "quarterly":
      return "Quarterly bonus";
    case "spot":
      return "Spot bonus";
    case "signing":
      return "Signing bonus";
    case "retention":
      return "Retention bonus";
    case "kpi_incentive":
      return "KPI incentive";
  }
}

export function variableCycleLabel(value: VariableCycle): string {
  switch (value) {
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "annual":
      return "Annual";
    case "one_off":
      return "One-off";
  }
}

export function variableStatusLabel(value: VariableStatus): string {
  switch (value) {
    case "draft":
      return "Draft";
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "paid":
      return "Paid";
    case "rejected":
      return "Rejected";
  }
}

export function bandPositionLabel(value: BandPosition): string {
  switch (value) {
    case "below":
      return "Below band";
    case "in_band":
      return "In band";
    case "above":
      return "Above band";
  }
}

export function appraisalLabel(value: AppraisalResult | null | undefined): string {
  switch (value) {
    case "exceeds":
      return "Exceeds";
    case "meets":
      return "Meets";
    case "developing":
      return "Developing";
    case "below":
      return "Below";
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
