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
import { t, intlLocale, intlDateOptions } from "@/i18n";

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
  if (!value) return "-";
  const d = parseIsoDate(value.slice(0, 10));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString(intlLocale(), intlDateOptions({
    month: "short",
    day: "numeric",
    year: "numeric",
  }));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(intlLocale(), intlDateOptions({
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }));
}

export function formatMoney(
  value: number | null | undefined,
  currency = "EGP",
  opts?: { compact?: boolean },
): string {
  if (value == null || !Number.isFinite(value)) return "-";
  if (opts?.compact && Math.abs(value) >= 1000) {
    return `${currency} ${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}k`;
  }
  return `${currency} ${Math.round(value).toLocaleString()}`;
}

export function formatDays(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  const rounded = Math.round(value * 10) / 10;
  const n = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return Math.abs(rounded) === 1
    ? t("{n} day", { n })
    : t("{n} days", { n });
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

export function stageLabel(stage: CandidateStage): string {
  return t(DEFAULT_STAGE_LABELS[stage]);
}

export function sourceLabel(source: CandidateSource): string {
  switch (source) {
    case "careers_page":
      return t("Careers page");
    case "referral":
      return t("Referral");
    case "linkedin":
      return t("LinkedIn");
    case "job_board":
      return t("Job board");
    case "recruiter_upload":
      return t("Recruiter upload");
    case "walk_in":
      return t("Walk-in");
    case "agency":
      return t("Agency");
    case "internal_transfer":
      return t("Internal transfer");
  }
}

export function jobStatusLabel(status: JobStatus): string {
  switch (status) {
    case "draft":
      return t("Draft");
    case "open":
      return t("Open");
    case "paused":
      return t("Paused");
    case "closed":
      return t("Closed");
    case "filled":
      return t("Filled");
  }
}

export function candidateStatusLabel(status: CandidateStatus): string {
  switch (status) {
    case "active":
      return t("Active");
    case "on_hold":
      return t("On hold");
    case "hired":
      return t("Hired");
    case "rejected":
      return t("Rejected");
    case "withdrawn":
      return t("Withdrawn");
    case "talent_pool":
      return t("Talent pool");
  }
}

export function priorityLabel(priority: JobPriority): string {
  switch (priority) {
    case "low":
      return t("Low");
    case "medium":
      return t("Medium");
    case "high":
      return t("High");
    case "urgent":
      return t("Urgent");
  }
}

export function employmentTypeLabel(type: EmploymentType): string {
  switch (type) {
    case "full_time":
      return t("Full-time");
    case "part_time":
      return t("Part-time");
    case "contract":
      return t("Contract");
    case "intern":
      return t("Intern");
  }
}

export function interviewTypeLabel(type: InterviewType): string {
  switch (type) {
    case "phone_screen":
      return t("Phone screen");
    case "assessment_review":
      return t("Assessment review");
    case "technical":
      return t("Technical");
    case "hiring_manager":
      return t("Hiring manager");
    case "panel":
      return t("Panel");
    case "final":
      return t("Final");
    case "culture":
      return t("Culture / team fit");
  }
}

export function interviewModeLabel(mode: InterviewMode): string {
  switch (mode) {
    case "onsite":
      return t("Onsite");
    case "phone":
      return t("Phone");
    case "online":
      return t("Online");
  }
}

export function interviewStatusLabel(status: InterviewStatus): string {
  switch (status) {
    case "scheduled":
      return t("Scheduled");
    case "confirmed":
      return t("Confirmed");
    case "rescheduled":
      return t("Rescheduled");
    case "completed":
      return t("Completed");
    case "no_show":
      return t("No-show");
    case "cancelled":
      return t("Cancelled");
  }
}

export function outcomeLabel(outcome: InterviewOutcome): string {
  switch (outcome) {
    case "pending":
      return t("Pending");
    case "advance":
      return t("Advance");
    case "hold":
      return t("Hold");
    case "reject":
      return t("Reject");
  }
}

export function recommendationLabel(rec: Recommendation): string {
  switch (rec) {
    case "strong_yes":
      return t("Strong yes");
    case "yes":
      return t("Yes");
    case "maybe":
      return t("Maybe");
    case "no":
      return t("No");
  }
}

export function offerStatusLabel(status: OfferStatus): string {
  switch (status) {
    case "draft":
      return t("Draft");
    case "pending_approval":
      return t("Awaiting approval");
    case "sent":
      return t("Sent");
    case "accepted":
      return t("Accepted");
    case "rejected":
      return t("Declined");
    case "expired":
      return t("Expired");
  }
}

export function commEventLabel(event: CommEvent): string {
  switch (event) {
    case "application_received":
      return t("Application received");
    case "interview_invitation":
      return t("Interview invitation");
    case "reminder":
      return t("Reminder");
    case "rejection":
      return t("Rejection");
    case "offer_sent":
      return t("Offer sent");
    case "follow_up":
      return t("Follow-up");
    case "status_update":
      return t("Status update");
  }
}

export function noteVisibilityLabel(v: NoteVisibility): string {
  switch (v) {
    case "recruiter":
      return t("Recruiter");
    case "hiring_manager":
      return t("Hiring manager");
    case "interviewer":
      return t("Interviewer");
    case "internal":
      return t("Internal only");
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
