import type { KpiStatus, KpiTrend, KpiUnit, ReviewCycle } from "./types";
import { t, intlDateOptions, intlLocale, intlNumberOptions } from "@/i18n";

export function formatNumber(value: number | null | undefined, digits = 1): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(intlLocale(), intlNumberOptions({
    maximumFractionDigits: digits,
    minimumFractionDigits: Number.isInteger(value) ? 0 : Math.min(digits, 1),
  })).format(value);
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
      return new Intl.NumberFormat(intlLocale(), intlNumberOptions({
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      })).format(value);
    case "minutes":
      return t("{n} min", { n: formatNumber(value, 0) });
    case "hours":
      return t("{n} h", { n: formatNumber(value, 1) });
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
  return d.toLocaleDateString(
    intlLocale(),
    intlDateOptions({ month: "short", day: "numeric", year: "numeric" }),
  );
}

export function statusLabel(status: KpiStatus): string {
  switch (status) {
    case "on_track":
      return t("On track");
    case "at_risk":
      return t("Close to target");
    case "below_target":
      return t("Below target");
    case "exceeded":
      return t("Above target");
    default:
      return t("Needs a result");
  }
}

export function trendLabel(trend: KpiTrend): string {
  switch (trend) {
    case "up":
      return t("Improving");
    case "down":
      return t("Declining");
    case "flat":
      return t("Stable");
    default:
      return t("New");
  }
}

export function cycleLabel(cycle: ReviewCycle): string {
  switch (cycle) {
    case "quarterly":
      return t("Quarterly");
    case "yearly":
      return t("Yearly");
    default:
      return t("Monthly");
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
