import type {
  LeaveBalanceTxnType,
  LeaveRequestStatus,
  LeaveUrgency,
  PartialDayType,
} from "./types";

export const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const TEXTAREA_CLASS =
  "min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

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

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = parseIsoDate(value);
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

export function formatDays(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  const n = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${n} ${Math.abs(rounded) === 1 ? "day" : "days"}`;
}

export function roundDays(value: number): number {
  return Math.round(value * 100) / 100;
}

export function statusLabel(status: LeaveRequestStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "cancelled":
      return "Cancelled";
    case "returned":
      return "Returned for edits";
    case "expired":
      return "Expired";
    default:
      return status;
  }
}

export function urgencyLabel(urgency: LeaveUrgency): string {
  return urgency === "emergency" ? "Emergency" : "Planned";
}

export function partialDayLabel(partial: PartialDayType): string {
  switch (partial) {
    case "first_half":
      return "Morning half-day";
    case "second_half":
      return "Afternoon half-day";
    case "custom_hours":
      return "Partial hours";
    default:
      return "Full day";
  }
}

export function txnLabel(type: LeaveBalanceTxnType): string {
  switch (type) {
    case "ACCRUAL":
      return "Accrual";
    case "CARRY_OVER":
      return "Carry-over";
    case "MANUAL_ADJUSTMENT":
      return "Manual adjustment";
    case "DEDUCTION":
      return "Approved deduction";
    case "CANCELLATION_CREDIT":
      return "Cancellation credit";
    case "EXPIRY":
      return "Expiry";
    case "POLICY_RESET":
      return "Policy reset";
    case "PENDING_RESERVE":
      return "Pending reserve";
    case "PENDING_RELEASE":
      return "Pending release";
    default:
      return type;
  }
}

export function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function startOfMonth(iso: string): string {
  const d = parseIsoDate(iso);
  return toIsoDate(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function endOfMonth(iso: string): string {
  const d = parseIsoDate(iso);
  return toIsoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function yearsOfService(hireDate: string, asOf: string): number {
  const hire = parseIsoDate(hireDate);
  const now = parseIsoDate(asOf);
  let years = now.getFullYear() - hire.getFullYear();
  const hadAnniversary =
    now.getMonth() > hire.getMonth() ||
    (now.getMonth() === hire.getMonth() && now.getDate() >= hire.getDate());
  if (!hadAnniversary) years -= 1;
  return Math.max(0, years);
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
