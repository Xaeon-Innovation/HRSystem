import type { ReviewCycle, PeriodWindow } from "./types";
import { addDays, isoDate } from "./format";

const CYCLE_DAYS: Record<ReviewCycle, number> = {
  monthly: 30,
  quarterly: 90,
  yearly: 365,
};

export function defaultPeriod(cycle: ReviewCycle, now = new Date()): PeriodWindow {
  const days = CYCLE_DAYS[cycle];
  const to = isoDate(now);
  const fromDate = addDays(now, -(days - 1));
  const from = isoDate(fromDate);
  const previousTo = isoDate(addDays(fromDate, -1));
  const previousFrom = isoDate(addDays(fromDate, -days));
  return {
    from,
    to,
    previousFrom,
    previousTo,
    cycle,
    label: `${from} → ${to}`,
  };
}

export function periodFromRange(
  cycle: ReviewCycle,
  from: string,
  to: string,
): PeriodWindow {
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return defaultPeriod(cycle);
  }
  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1,
  );
  const previousTo = isoDate(addDays(start, -1));
  const previousFrom = isoDate(addDays(start, -days));
  return {
    from,
    to,
    previousFrom,
    previousTo,
    cycle,
    label: `${from} → ${to}`,
  };
}

export function inRange(iso: string, from: string, to: string): boolean {
  const day = iso.slice(0, 10);
  return day >= from && day <= to;
}
