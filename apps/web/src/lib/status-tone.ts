export type Tone = "ok" | "warn" | "danger" | "info" | "neutral" | "yellow" | "ink";

const OK =
  /\b(approved|active|on shift|on time|clocked in|completed|hired|paid|connected|ga|converted|on track|accepted|resolved|succeeded)\b/i;
const WARN =
  /\b(pending|submitted|in progress|trial|lab|contacted|on hold|late|qualified|changes requested|paused|syncing|offer extended)\b/i;
const DANGER =
  /\b(rejected|failed|missed clock-out|suspended|urgent|overdue|expired|cancelled|off track|past due|critical|withdrawn)\b/i;
const INFO = /\b(new|open|draft|returned|scheduled)\b/i;

export function statusTone(status: string): Tone {
  const s = status.trim();
  if (!s) return "neutral";
  if (OK.test(s)) return "ok";
  if (WARN.test(s)) return "warn";
  if (DANGER.test(s)) return "danger";
  if (INFO.test(s)) return "info";
  return "neutral";
}

const textMap: Record<Tone, string> = {
  ok: "text-accent-strong",
  warn: "text-warn",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-ink-muted",
  yellow: "text-yellow",
  ink: "text-ink",
};

const bgMap: Record<Tone, string> = {
  ok: "bg-accent-strong",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-surface-3",
  yellow: "bg-yellow",
  ink: "bg-ink",
};

export function toneTextClass(tone: Tone): string {
  return textMap[tone];
}

export function toneBgClass(tone: Tone): string {
  return bgMap[tone];
}
