/**
 * Split closed attendance sessions into minutes inside the scheduled shift
 * window vs minutes worked after shift end (overtime).
 * Employees with no shift that day: all worked time counts as shift; OT = 0.
 */

export type ClosedSession = {
  clockInAt: Date;
  clockOutAt: Date;
};

export type ShiftWindow = {
  startAt: Date;
  endAt: Date;
};

function overlapMs(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return Math.max(0, end - start);
}

export function computeShiftAndOvertimeMinutes(
  sessions: ClosedSession[],
  shifts: ShiftWindow[],
): { shiftMinutes: number; overtimeMinutes: number; totalWorkMinutes: number } {
  let totalWorkMs = 0;
  let shiftMs = 0;
  let overtimeMs = 0;

  for (const session of sessions) {
    const inMs = session.clockInAt.getTime();
    const outMs = session.clockOutAt.getTime();
    if (!Number.isFinite(inMs) || !Number.isFinite(outMs) || outMs <= inMs) {
      continue;
    }
    totalWorkMs += outMs - inMs;

    if (shifts.length === 0) {
      shiftMs += outMs - inMs;
      continue;
    }

    for (const shift of shifts) {
      const sStart = shift.startAt.getTime();
      const sEnd = shift.endAt.getTime();
      shiftMs += overlapMs(inMs, outMs, sStart, sEnd);
      // Work after this shift's end counts as overtime
      if (outMs > sEnd && inMs < outMs) {
        const otStart = Math.max(inMs, sEnd);
        overtimeMs += Math.max(0, outMs - otStart);
      }
    }
  }

  // If multiple shifts overlap the same OT segment, we may double-count OT.
  // Prefer a single shift per day in practice; clamp OT so shift+OT <= total.
  const totalWorkMinutes = Math.round(totalWorkMs / 60_000);
  let shiftMinutes = Math.round(shiftMs / 60_000);
  let overtimeMinutes = Math.round(overtimeMs / 60_000);
  if (shifts.length > 1 && shiftMinutes + overtimeMinutes > totalWorkMinutes) {
    overtimeMinutes = Math.max(0, totalWorkMinutes - shiftMinutes);
  }
  if (shifts.length === 0) {
    overtimeMinutes = 0;
    shiftMinutes = totalWorkMinutes;
  }

  return { shiftMinutes, overtimeMinutes, totalWorkMinutes };
}

export function formatLatLng(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null;
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
