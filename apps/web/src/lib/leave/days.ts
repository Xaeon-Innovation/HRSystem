import { addDaysIso, parseIsoDate, roundDays, toIsoDate } from "./format";
import type { CountLeaveDaysInput, LeaveHoliday, WeekendRule } from "./types";

export function isWeekend(iso: string, rule: WeekendRule): boolean {
  if (rule === "none") return false;
  const day = parseIsoDate(iso).getDay();
  if (rule === "sat_sun") return day === 0 || day === 6;
  return day === 5 || day === 6;
}

export function holidayName(
  iso: string,
  holidays: LeaveHoliday[],
): string | null {
  return holidays.find((h) => h.date === iso)?.name ?? null;
}

export function eachDate(startDate: string, endDate: string): string[] {
  if (endDate < startDate) return [];
  const out: string[] = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    out.push(cursor);
    cursor = addDaysIso(cursor, 1);
  }
  return out;
}

export function isCountableDay(
  iso: string,
  weekendRule: WeekendRule,
  holidays: LeaveHoliday[],
  countHolidays: boolean,
): boolean {
  if (isWeekend(iso, weekendRule)) return false;
  if (!countHolidays && holidayName(iso, holidays)) return false;
  return true;
}

export function countLeaveDays(input: CountLeaveDaysInput): number {
  const { startDate, endDate, partialDayType, customHours } = input;
  if (!startDate || !endDate || endDate < startDate) return 0;

  const dates = eachDate(startDate, endDate).filter((d) =>
    isCountableDay(d, input.weekendRule, input.holidays, input.countHolidays),
  );
  if (dates.length === 0) return 0;

  if (startDate === endDate) {
    if (partialDayType === "first_half" || partialDayType === "second_half") {
      return 0.5;
    }
    if (partialDayType === "custom_hours") {
      const hours = customHours ?? 0;
      return roundDays(Math.min(1, Math.max(0, hours / 8)));
    }
    return 1;
  }

  return roundDays(dates.length);
}

export function unusedDaysAfterCancel(input: {
  startDate: string;
  endDate: string;
  requestedDays: number;
  asOf: string;
  weekendRule: WeekendRule;
  holidays: LeaveHoliday[];
  countHolidays: boolean;
}): number {
  if (input.asOf < input.startDate) return input.requestedDays;
  if (input.asOf > input.endDate) return 0;
  const remainingDates = eachDate(input.asOf, input.endDate).filter((d) =>
    isCountableDay(d, input.weekendRule, input.holidays, input.countHolidays),
  );
  return roundDays(Math.min(input.requestedDays, remainingDates.length));
}

export function monthGrid(iso: string): string[] {
  const first = parseIsoDate(`${iso.slice(0, 7)}-01`);
  const startWeekday = first.getDay();
  const gridStart = new Date(first);
  gridStart.setDate(1 - startWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return toIsoDate(d);
  });
}
