export function zonedStartOfDay(day: string, timeZone: string): Date {
  const [y, m, d] = day.split("-").map(Number);
  const utcGuess = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(utcGuess);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  const localAsUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  const offsetMs = localAsUtc - utcGuess.getTime();
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - offsetMs);
}

export function zonedDayBounds(day: string, timeZone: string): {
  start: Date;
  end: Date;
} {
  const start = zonedStartOfDay(day, timeZone);
  const [y, m, d] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDay = next.toISOString().slice(0, 10);
  const end = zonedStartOfDay(nextDay, timeZone);
  return { start, end };
}

export function formatDayInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function todayInZone(timeZone: string): string {
  return formatDayInZone(new Date(), timeZone);
}

export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}
