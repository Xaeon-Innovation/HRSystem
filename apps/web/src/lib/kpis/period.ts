import type { ReviewCycle, PeriodWindow } from "./types";
import { addDays, isoDate } from "./format";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q + 3, 0);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31);
}

function shiftCalendar(cycle: ReviewCycle, anchor: Date, periodsBack: number): Date {
  const d = new Date(anchor);
  if (cycle === "monthly") {
    d.setMonth(d.getMonth() - periodsBack);
    return d;
  }
  if (cycle === "quarterly") {
    d.setMonth(d.getMonth() - periodsBack * 3);
    return d;
  }
  d.setFullYear(d.getFullYear() - periodsBack);
  return d;
}

function boundsFor(cycle: ReviewCycle, anchor: Date): { from: Date; to: Date } {
  if (cycle === "monthly") {
    return { from: startOfMonth(anchor), to: endOfMonth(anchor) };
  }
  if (cycle === "quarterly") {
    return { from: startOfQuarter(anchor), to: endOfQuarter(anchor) };
  }
  return { from: startOfYear(anchor), to: endOfYear(anchor) };
}

function cycleLabel(cycle: ReviewCycle, from: Date, to: Date): string {
  if (cycle === "monthly") {
    return from.toLocaleString("en", { month: "short", year: "numeric" });
  }
  if (cycle === "quarterly") {
    const q = Math.floor(from.getMonth() / 3) + 1;
    return `Q${q} ${from.getFullYear()}`;
  }
  return String(from.getFullYear());
}

/** Calendar month / quarter / year window (not rolling days), with previous period. */
export function defaultPeriod(cycle: ReviewCycle, now = new Date()): PeriodWindow {
  const current = boundsFor(cycle, now);
  const prevAnchor = shiftCalendar(cycle, now, 1);
  const previous = boundsFor(cycle, prevAnchor);
  return {
    from: isoDate(current.from),
    to: isoDate(current.to),
    previousFrom: isoDate(previous.from),
    previousTo: isoDate(previous.to),
    cycle,
    label: cycleLabel(cycle, current.from, current.to),
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
