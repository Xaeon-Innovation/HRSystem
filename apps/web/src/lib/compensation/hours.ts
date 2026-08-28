import { parseIsoDate, roundMoney, toIsoDate } from "./format";
import type { ClockShift, ShiftHoursRow, WorkedHours } from "./types";

export const OT_MULTIPLIER = 1.5;

export function standardDailyHours(hoursPerWeek = 40): number {
  const week = hoursPerWeek > 0 ? hoursPerWeek : 40;
  return roundMoney(week / 5);
}

export function hoursBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / 3_600_000;
}

/** Minutes of a shift that fall inside [periodStart, periodEndEnd). */
export function overlapHours(
  clockInIso: string,
  clockOutIso: string,
  periodStart: string,
  periodEnd: string,
): number {
  const start = Math.max(
    new Date(clockInIso).getTime(),
    parseIsoDate(periodStart).getTime(),
  );
  const endBound = parseIsoDate(periodEnd);
  endBound.setHours(23, 59, 59, 999);
  const end = Math.min(new Date(clockOutIso).getTime(), endBound.getTime());
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / 3_600_000;
}

export function effectiveClockOut(
  shift: ClockShift,
  asOfIso: string,
): { out: string; open: boolean } {
  if (shift.clockOutAt) return { out: shift.clockOutAt, open: false };
  return { out: asOfIso, open: true };
}

export function summarizeHours(
  shifts: ClockShift[],
  periodStart: string,
  periodEnd: string,
  opts?: { hoursPerWeek?: number; asOf?: string; employeeId?: string },
): WorkedHours {
  const asOf = opts?.asOf ?? new Date().toISOString();
  const threshold = standardDailyHours(opts?.hoursPerWeek);
  const employeeId = opts?.employeeId ?? shifts[0]?.employeeId ?? "";
  const rows: ShiftHoursRow[] = [];
  const byDay = new Map<string, number>();
  let openShiftCount = 0;

  for (const shift of shifts) {
    if (opts?.employeeId && shift.employeeId !== opts.employeeId) continue;
    const { out, open } = effectiveClockOut(shift, asOf);
    const hours = roundMoney(overlapHours(shift.clockInAt, out, periodStart, periodEnd));
    if (hours <= 0) continue;
    if (open) openShiftCount += 1;
    rows.push({
      clockInAt: shift.clockInAt,
      clockOutAt: shift.clockOutAt,
      hours,
      open,
    });
    const day = toIsoDate(new Date(shift.clockInAt));
    byDay.set(day, (byDay.get(day) ?? 0) + hours);
  }

  let regularHours = 0;
  let overtimeHours = 0;
  for (const hours of byDay.values()) {
    regularHours += Math.min(hours, threshold);
    overtimeHours += Math.max(0, hours - threshold);
  }

  return {
    employeeId,
    totalHours: roundMoney(regularHours + overtimeHours),
    regularHours: roundMoney(regularHours),
    overtimeHours: roundMoney(overtimeHours),
    openShiftCount,
    shiftCount: rows.length,
    shifts: rows.sort((a, b) => b.clockInAt.localeCompare(a.clockInAt)),
  };
}

export function groupShiftsByEmployee(shifts: ClockShift[]): Map<string, ClockShift[]> {
  const map = new Map<string, ClockShift[]>();
  for (const s of shifts) {
    const list = map.get(s.employeeId) ?? [];
    list.push(s);
    map.set(s.employeeId, list);
  }
  return map;
}

export function hourlyEarned(rate: number, regularHours: number, overtimeHours: number): {
  regular: number;
  overtime: number;
  gross: number;
} {
  const regular = roundMoney(rate * regularHours);
  const overtime = roundMoney(rate * OT_MULTIPLIER * overtimeHours);
  return { regular, overtime, gross: roundMoney(regular + overtime) };
}
