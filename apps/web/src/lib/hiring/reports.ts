import { currentMonthKey, daysBetween, daysInStageNow, monthKey, sameDay, stageLabel } from "./format";
import { ACTIVE_PIPELINE_STAGES, STUCK_STAGE_DAYS } from "./workflow";
import { CANDIDATE_SOURCES, CANDIDATE_STAGES } from "./types";
import type {
  Candidate,
  Interview,
  InterviewScorecard,
  JobOpening,
  Offer,
  RecruitmentMetricSummary,
  SourceStat,
  StageConversion,
  StageCount,
} from "./types";

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

function acceptedOfferFor(candidateId: string, offers: Offer[]): Offer | undefined {
  return offers
    .filter((o) => o.candidateId === candidateId && o.status === "accepted")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function timeToHireDays(candidate: Candidate, offers: Offer[]): number | null {
  const offer = acceptedOfferFor(candidate.id, offers);
  const end = offer?.updatedAt ?? candidate.hiredAt;
  if (!end) return null;
  return Math.max(0, daysBetween(candidate.createdAt, end));
}

export function timeToFillDays(job: JobOpening, offers: Offer[], candidates: Candidate[]): number | null {
  if (!job.openedAt) return null;
  const accepted = offers.filter((o) => o.jobId === job.id && o.status === "accepted");
  if (!accepted.length) {
    const hired = candidates.find((c) => c.appliedJobId === job.id && c.hiredAt);
    if (!hired?.hiredAt) return null;
    return Math.max(0, daysBetween(job.openedAt, hired.hiredAt));
  }
  const first = [...accepted].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))[0];
  return Math.max(0, daysBetween(job.openedAt, first!.updatedAt));
}

export function currentStageEnteredAt(candidate: Candidate): string {
  const open = [...candidate.stageHistory].reverse().find((h) => h.stage === candidate.currentStage && !h.leftAt);
  return open?.enteredAt ?? candidate.updatedAt;
}

export function buildHiringSummary(input: {
  jobs: JobOpening[];
  candidates: Candidate[];
  interviews: Interview[];
  offers: Offer[];
  scorecards: InterviewScorecard[];
  now?: Date;
}): RecruitmentMetricSummary {
  const now = input.now ?? new Date();
  const today = now.toISOString();
  const month = currentMonthKey(now);

  const openJobs = input.jobs.filter((j) => j.status === "open");
  const pipeline = input.candidates.filter((c) => ACTIVE_PIPELINE_STAGES.includes(c.currentStage));
  const interviewsToday = input.interviews.filter(
    (i) => sameDay(i.scheduledAt, today.slice(0, 10)) && i.status !== "cancelled",
  );
  const offersPending = input.offers.filter((o) => o.status === "sent" || o.status === "pending_approval");
  const hiresThisMonth = input.candidates.filter(
    (c) => c.hiredAt && monthKey(c.hiredAt) === month,
  );

  const hireDurations = input.candidates
    .map((c) => timeToHireDays(c, input.offers))
    .filter((n): n is number => n != null);
  const fillDurations = input.jobs
    .map((j) => timeToFillDays(j, input.offers, input.candidates))
    .filter((n): n is number => n != null);

  const stageCounts: StageCount[] = CANDIDATE_STAGES.map((stage) => {
    const inStage = input.candidates.filter((c) => c.currentStage === stage);
    const days = inStage.map((c) => daysInStageNow(currentStageEnteredAt(c), now));
    return {
      stage,
      label: stageLabel(stage),
      count: inStage.length,
      avgDays: mean(days),
    };
  });

  const bottleneckCount = pipeline.filter((c) => {
    const days = daysInStageNow(currentStageEnteredAt(c), now);
    return days >= STUCK_STAGE_DAYS;
  }).length;

  const sourcePerformance: SourceStat[] = CANDIDATE_SOURCES.map((source) => {
    const list = input.candidates.filter((c) => c.source === source);
    const hired = list.filter((c) => c.currentStage === "hired" || c.status === "hired").length;
    return {
      source,
      candidates: list.length,
      hired,
      hireRate: list.length ? hired / list.length : 0,
    };
  }).filter((s) => s.candidates > 0);

  const stageConversion: StageConversion[] = [];
  for (let i = 0; i < CANDIDATE_STAGES.length - 1; i++) {
    const from = CANDIDATE_STAGES[i]!;
    const to = CANDIDATE_STAGES[i + 1]!;
    if (from === "rejected" || to === "rejected") continue;
    const entered = input.candidates.filter((c) =>
      c.stageHistory.some((h) => h.stage === from),
    ).length;
    const converted = input.candidates.filter((c) => {
      const hist = c.stageHistory;
      const fromIdx = hist.findIndex((h) => h.stage === from);
      if (fromIdx < 0) return false;
      return hist.slice(fromIdx + 1).some((h) => h.stage === to) || c.currentStage === to;
    }).length;
    stageConversion.push({
      from,
      to,
      entered,
      converted,
      rate: entered ? converted / entered : 0,
    });
  }

  const interviewed = new Set(
    input.interviews.filter((i) => i.status === "completed" || i.outcome !== "pending").map((i) => i.candidateId),
  );
  const offered = new Set(input.offers.map((o) => o.candidateId));
  const accepted = input.offers.filter((o) => o.status === "accepted").length;
  const decided = input.offers.filter((o) => o.status === "accepted" || o.status === "rejected").length;

  const timeInStage = stageCounts
    .filter((s) => s.avgDays != null && s.stage !== "hired" && s.stage !== "rejected")
    .map((s) => ({ stage: s.stage, label: s.label, avgDays: s.avgDays ?? 0 }));

  return {
    openPositions: openJobs.length,
    openingsHeadcount: openJobs.reduce((n, j) => n + Math.max(0, j.openingsCount - j.filledCount), 0),
    candidatesInPipeline: pipeline.length,
    interviewsToday: interviewsToday.length,
    offersPending: offersPending.length,
    hiresThisMonth: hiresThisMonth.length,
    avgTimeToHireDays: mean(hireDurations),
    avgTimeToFillDays: mean(fillDurations),
    bottleneckCount,
    offerAcceptanceRate: decided ? accepted / decided : null,
    interviewToOfferRate: interviewed.size ? offered.size / interviewed.size : null,
    stageCounts,
    sourcePerformance,
    stageConversion,
    timeInStage,
  };
}
