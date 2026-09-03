import type {
  CandidateSource,
  CandidateStage,
  CandidateStatus,
  CommEvent,
  EmploymentType,
  InterviewMode,
  InterviewOutcome,
  InterviewStatus,
  InterviewType,
  JobPriority,
  JobStatus,
  NoteVisibility,
  OfferStatus,
  Recommendation,
} from "./types";
import { CANDIDATE_STAGES } from "./types";

export const SELECT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export const TEXTAREA_CLASS =
  "min-h-[88px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export const DEFAULT_STAGE_LABELS: Record<CandidateStage, string> = {
  sourced: "Sourced / Applied",
  resume_reviewed: "Resume reviewed",
  phone_screen: "Phone screen",
  assessment: "Assessment",
  interview_r1: "Interview round 1",
  interview_r2: "Interview round 2",
  final_interview: "Final interview",
  offer_extended: "Offer extended",
  offer_accepted: "Offer accepted",
  hired: "Hired",
  rejected: "Rejected",
};

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `${prefix}-${rand}`;
}

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
  const a = parseIsoDate(from.slice(0, 10)).getTime();
  const b = parseIsoDate(to.slice(0, 10)).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function hoursBetween(fromIso: string, toIso: string): number {
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  return (b - a) / 3_600_000;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = parseIsoDate(value.slice(0, 10));
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

export function formatMoney(
  value: number | null | undefined,
  currency = "EGP",
  opts?: { compact?: boolean },
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (opts?.compact && Math.abs(value) >= 1000) {
    return `${currency} ${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return `${currency} ${Math.round(value).toLocaleString()}`;
}

export function formatDays(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 10) / 10;
  const n = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${n} ${Math.abs(rounded) === 1 ? "day" : "days"}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

export function stageLabel(stage: CandidateStage): string {
  return DEFAULT_STAGE_LABELS[stage];
}

export function sourceLabel(source: CandidateSource): string {
  switch (source) {
    case "careers_page":
      return "Careers page";
    case "referral":
      return "Referral";
    case "linkedin":
      return "LinkedIn";
    case "job_board":
      return "Job board";
    case "recruiter_upload":
      return "Recruiter upload";
    case "walk_in":
      return "Walk-in";
    case "agency":
      return "Agency";
    case "internal_transfer":
      return "Internal transfer";
  }
}

export function jobStatusLabel(status: JobStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "open":
      return "Open";
    case "paused":
      return "Paused";
    case "closed":
      return "Closed";
    case "filled":
      return "Filled";
  }
}

export function candidateStatusLabel(status: CandidateStatus): string {
  switch (status) {
    case "active":
      return "Active";
    case "on_hold":
      return "On hold";
    case "hired":
      return "Hired";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
    case "talent_pool":
      return "Talent pool";
  }
}

export function priorityLabel(priority: JobPriority): string {
  switch (priority) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "urgent":
      return "Urgent";
  }
}

export function employmentTypeLabel(type: EmploymentType): string {
  switch (type) {
    case "full_time":
      return "Full-time";
    case "part_time":
      return "Part-time";
    case "contract":
      return "Contract";
    case "intern":
      return "Intern";
  }
}

export function interviewTypeLabel(type: InterviewType): string {
  switch (type) {
    case "phone_screen":
      return "Phone screen";
    case "assessment_review":
      return "Assessment review";
    case "technical":
      return "Technical";
    case "hiring_manager":
      return "Hiring manager";
    case "panel":
      return "Panel";
    case "final":
      return "Final";
    case "culture":
      return "Culture / team fit";
  }
}

export function interviewModeLabel(mode: InterviewMode): string {
  switch (mode) {
    case "onsite":
      return "Onsite";
    case "phone":
      return "Phone";
    case "online":
      return "Online";
  }
}

export function interviewStatusLabel(status: InterviewStatus): string {
  switch (status) {
    case "scheduled":
      return "Scheduled";
    case "confirmed":
      return "Confirmed";
    case "rescheduled":
      return "Rescheduled";
    case "completed":
      return "Completed";
    case "no_show":
      return "No-show";
    case "cancelled":
      return "Cancelled";
  }
}

export function outcomeLabel(outcome: InterviewOutcome): string {
  switch (outcome) {
    case "pending":
      return "Pending";
    case "advance":
      return "Advance";
    case "hold":
      return "Hold";
    case "reject":
      return "Reject";
  }
}

export function recommendationLabel(rec: Recommendation): string {
  switch (rec) {
    case "strong_yes":
      return "Strong yes";
    case "yes":
      return "Yes";
    case "maybe":
      return "Maybe";
    case "no":
      return "No";
  }
}

export function offerStatusLabel(status: OfferStatus): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "pending_approval":
      return "Awaiting approval";
    case "sent":
      return "Sent";
    case "accepted":
      return "Accepted";
    case "rejected":
      return "Declined";
    case "expired":
      return "Expired";
  }
}

export function commEventLabel(event: CommEvent): string {
  switch (event) {
    case "application_received":
      return "Application received";
    case "interview_invitation":
      return "Interview invitation";
    case "reminder":
      return "Reminder";
    case "rejection":
      return "Rejection";
    case "offer_sent":
      return "Offer sent";
    case "follow_up":
      return "Follow-up";
    case "status_update":
      return "Status update";
  }
}

export function noteVisibilityLabel(v: NoteVisibility): string {
  switch (v) {
    case "recruiter":
      return "Recruiter";
    case "hiring_manager":
      return "Hiring manager";
    case "interviewer":
      return "Interviewer";
    case "internal":
      return "Internal only";
  }
}

export function stageIndex(stage: CandidateStage): number {
  return CANDIDATE_STAGES.indexOf(stage);
}

export function stars(rating: number): string {
  const n = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function parseSkillList(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function sameDay(iso: string, day = todayIso()): boolean {
  return iso.slice(0, 10) === day;
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function currentMonthKey(now = new Date()): string {
  return toIsoDate(now).slice(0, 7);
}

export function daysInStageNow(enteredAt: string, now = new Date()): number {
  return Math.max(0, daysBetween(enteredAt.slice(0, 10), toIsoDate(now)));
}
