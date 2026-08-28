import type { KpiStatus, KpiTrend, KpiUnit, ReviewCycle } from "./types";

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(value) ? 0 : Math.min(digits, 1),
  }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, digits)}%`;
}

export function formatKpiValue(
  value: number | null | undefined,
  unit: KpiUnit,
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  switch (unit) {
    case "percent":
      return formatPercent(value, value >= 10 ? 0 : 1);
    case "currency":
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
    case "minutes":
      return `${formatNumber(value, 0)} min`;
    case "hours":
      return `${formatNumber(value, 1)} h`;
    case "score":
      return formatNumber(value, 1);
    case "ratio":
      return formatNumber(value, 2);
    default:
      return formatNumber(value, 0);
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function statusLabel(status: KpiStatus): string {
  switch (status) {
    case "on_track":
      return "On track";
    case "at_risk":
      return "Close to target";
    case "below_target":
      return "Below target";
    case "exceeded":
      return "Above target";
    default:
      return "Needs a result";
  }
}

export function trendLabel(trend: KpiTrend): string {
  switch (trend) {
    case "up":
      return "Improving";
    case "down":
      return "Declining";
    case "flat":
      return "Stable";
    default:
      return "New";
  }
}

export function cycleLabel(cycle: ReviewCycle): string {
  switch (cycle) {
    case "quarterly":
      return "Quarterly";
    case "yearly":
      return "Yearly";
    default:
      return "Monthly";
  }
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
}

export const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
