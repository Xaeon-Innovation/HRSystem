export type AttendanceSession = {
  id: string;
  clockInAt: string;
  clockOutAt: string | null;
  anomalyFlags: string[];
  clockInLat?: number | null;
  clockInLng?: number | null;
  clockOutLat?: number | null;
  clockOutLng?: number | null;
  clockInPlace?: string | null;
  clockOutPlace?: string | null;
};

export type AttendanceShift = {
  id?: string;
  startAt: string;
  endAt: string;
};

export type AttendancePerson = {
  employeeId: string;
  name: string;
  avatarUrl: string | null;
  presenceMode?: "fixed_zone" | "mobile";
  shifts?: AttendanceShift[];
  sessions: AttendanceSession[];
};

export type DayStatus = "working" | "out" | "missed_out" | "no_clock";

export function personStatus(person: AttendancePerson): DayStatus {
  if (person.sessions.length === 0) return "no_clock";
  if (person.sessions.some((s) => !s.clockOutAt)) return "working";
  if (
    person.sessions.some((s) =>
      s.anomalyFlags?.includes("missed_clock_out"),
    )
  ) {
    return "missed_out";
  }
  return "out";
}

export function sessionNeedsFix(session: AttendanceSession): boolean {
  return (
    !session.clockOutAt ||
    Boolean(session.anomalyFlags?.includes("missed_clock_out"))
  );
}

export function formatClockTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function formatDuration(inAt: string, outAt: string | null) {
  if (!outAt) return null;
  const ms = new Date(outAt).getTime() - new Date(inAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const totalMin = Math.round(ms / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatMinutesAsHours(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Decimal hours for hours-report tables (e.g. 8.50). */
export function formatMinutesAsDecimalHours(minutes: number, digits = 2) {
  return (Math.max(0, minutes) / 60).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Prototype status chip labels (On time / Late / Missed clock-out / …). */
export function attendanceDisplayStatus(person: AttendancePerson): string {
  const status = personStatus(person);
  if (status === "missed_out") return "Missed clock-out";
  if (status === "no_clock") return "No clock";

  const shift = person.shifts?.[0];
  const first = [...person.sessions].sort(
    (a, b) =>
      new Date(a.clockInAt).getTime() - new Date(b.clockInAt).getTime(),
  )[0];
  if (shift && first) {
    const graceMs = 5 * 60 * 1000;
    if (
      new Date(first.clockInAt).getTime() >
      new Date(shift.startAt).getTime() + graceMs
    ) {
      return "Late";
    }
  }
  return "On time";
}

export function presenceModeLabel(
  mode: AttendancePerson["presenceMode"],
): string {
  return mode === "mobile" ? "Mobile" : "Fixed zone";
}

/** Map a wall-clock instant into a 06:00–18:00 session bar (0–100). */
export function sessionBarPercent(iso: string, day: string): number {
  const [y, m, d] = day.split("-").map(Number);
  const dayStart = new Date(y!, m! - 1, d!, 6, 0, 0, 0).getTime();
  const dayEnd = new Date(y!, m! - 1, d!, 18, 0, 0, 0).getTime();
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.min(100, ((t - dayStart) / (dayEnd - dayStart)) * 100));
}

export function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysIso(day: string, delta: number) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d! + delta);
  return toIsoDate(dt);
}

export function formatChipLabel(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatDayHeading(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(y!, m! - 1, d!);
  return dt.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}
