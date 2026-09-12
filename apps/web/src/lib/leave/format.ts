export {
  SELECT_CLASS,
  TEXTAREA_CLASS,
  toIsoDate,
  parseIsoDate,
  todayIso,
  addDaysIso,
  daysBetween,
  roundDays,
  newId,
  startOfMonth,
  endOfMonth,
  monthKey,
  yearsOfService,
  rangesOverlap,
} from "@hr/shared";
import {
  formatDate as formatDateEn,
  statusLabel as statusLabelEn,
  urgencyLabel as urgencyLabelEn,
  partialDayLabel as partialDayLabelEn,
  txnLabel as txnLabelEn,
} from "@hr/shared";
import { t, intlDateOptions, intlLocale } from "@/i18n";
import type {
  LeaveBalanceTxnType,
  LeaveRequestStatus,
  LeaveUrgency,
  PartialDayType,
} from "./types";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const formatted = formatDateEn(value);
  if (formatted === "—") return formatted;
  const d = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return formatted;
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

export function formatDays(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  const n = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return Math.abs(rounded) === 1 ? t("{n} day", { n }) : t("{n} days", { n });
}

export function statusLabel(status: LeaveRequestStatus): string {
  return t(statusLabelEn(status));
}

export function urgencyLabel(urgency: LeaveUrgency): string {
  return t(urgencyLabelEn(urgency));
}

export function partialDayLabel(partial: PartialDayType): string {
  return t(partialDayLabelEn(partial));
}

export function txnLabel(type: LeaveBalanceTxnType): string {
  return t(txnLabelEn(type));
}
