import { cn } from "@/lib/utils";
import {
  candidateStatusLabel,
  interviewStatusLabel,
  jobStatusLabel,
  offerStatusLabel,
  outcomeLabel,
  priorityLabel,
  recommendationLabel,
  sourceLabel,
  stageLabel,
} from "@/lib/hiring/format";
import type {
  CandidateSource,
  CandidateStage,
  CandidateStatus,
  InterviewOutcome,
  InterviewStatus,
  JobPriority,
  JobStatus,
  OfferStatus,
  Recommendation,
} from "@/lib/hiring/types";

const PILL =
  "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide";

const JOB_STATUS: Record<JobStatus, string> = {
  draft:
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
  open: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  paused:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  closed:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-700",
  filled:
    "bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
};

const STAGE: Record<CandidateStage, string> = {
  sourced:
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
  resume_reviewed:
    "bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  phone_screen:
    "bg-cyan-50 text-cyan-900 ring-1 ring-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-800",
  assessment:
    "bg-indigo-50 text-indigo-900 ring-1 ring-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:ring-indigo-800",
  interview_r1:
    "bg-violet-50 text-violet-900 ring-1 ring-violet-200 dark:bg-violet-950/60 dark:text-violet-300 dark:ring-violet-800",
  interview_r2:
    "bg-fuchsia-50 text-fuchsia-900 ring-1 ring-fuchsia-200 dark:bg-fuchsia-950/60 dark:text-fuchsia-300 dark:ring-fuchsia-800",
  final_interview:
    "bg-purple-50 text-purple-900 ring-1 ring-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:ring-purple-800",
  offer_extended:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  offer_accepted:
    "bg-teal-50 text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-800",
  hired:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  rejected:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
};

const CAND_STATUS: Record<CandidateStatus, string> = {
  active:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  on_hold:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  hired:
    "bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  rejected:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
  withdrawn:
    "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-700",
  talent_pool:
    "bg-teal-50 text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-800",
};

const PRIORITY: Record<JobPriority, string> = {
  low: "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-700",
  medium:
    "bg-sky-50 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  high: "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  urgent:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
};

const OFFER: Record<OfferStatus, string> = {
  draft:
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
  pending_approval:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  sent: "bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  accepted:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  rejected:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
  expired:
    "bg-stone-100 text-stone-600 ring-1 ring-stone-200 dark:bg-stone-800/80 dark:text-stone-300 dark:ring-stone-700",
};

const INTERVIEW: Record<InterviewStatus, string> = {
  scheduled:
    "bg-sky-50 text-sky-900 ring-1 ring-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-800",
  confirmed:
    "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
  rescheduled:
    "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
  completed:
    "bg-slate-100 text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:ring-slate-700",
  no_show:
    "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
  cancelled:
    "bg-stone-100 text-stone-600 ring-1 ring-stone-200 dark:bg-stone-800/80 dark:text-stone-300 dark:ring-stone-700",
};

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={cn(PILL, JOB_STATUS[status])}>{jobStatusLabel(status)}</span>;
}

export function StageBadge({ stage }: { stage: CandidateStage }) {
  return <span className={cn(PILL, STAGE[stage])}>{stageLabel(stage)}</span>;
}

export function CandidateStatusBadge({ status }: { status: CandidateStatus }) {
  return <span className={cn(PILL, CAND_STATUS[status])}>{candidateStatusLabel(status)}</span>;
}

export function PriorityBadge({ priority }: { priority: JobPriority }) {
  return <span className={cn(PILL, PRIORITY[priority])}>{priorityLabel(priority)}</span>;
}

export function OfferStatusBadge({ status }: { status: OfferStatus }) {
  return <span className={cn(PILL, OFFER[status])}>{offerStatusLabel(status)}</span>;
}

export function InterviewStatusBadge({ status }: { status: InterviewStatus }) {
  return <span className={cn(PILL, INTERVIEW[status])}>{interviewStatusLabel(status)}</span>;
}

export function SourceChip({ source }: { source: CandidateSource }) {
  return (
    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
      {sourceLabel(source)}
    </span>
  );
}

export function OutcomeBadge({ outcome }: { outcome: InterviewOutcome }) {
  return (
    <span
      className={cn(
        PILL,
        outcome === "advance" &&
          "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
        outcome === "reject" &&
          "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
        outcome === "hold" &&
          "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
        outcome === "pending" &&
          "bg-slate-100 text-slate-600 ring-1 ring-slate-200 dark:bg-slate-800/80 dark:text-slate-400 dark:ring-slate-700",
      )}
    >
      {outcomeLabel(outcome)}
    </span>
  );
}

export function RecommendationBadge({ value }: { value: Recommendation }) {
  return (
    <span
      className={cn(
        PILL,
        value === "strong_yes" &&
          "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-800",
        value === "yes" &&
          "bg-teal-50 text-teal-900 ring-1 ring-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:ring-teal-800",
        value === "maybe" &&
          "bg-amber-50 text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
        value === "no" &&
          "bg-rose-50 text-rose-800 ring-1 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800",
      )}
    >
      {recommendationLabel(value)}
    </span>
  );
}

export function TagChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
      {label}
    </span>
  );
}
