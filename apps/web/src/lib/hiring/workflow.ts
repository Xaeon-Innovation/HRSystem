import { hasSystemModuleRole } from "@hr/shared";
import { CANDIDATE_STAGES, type Candidate, type CandidateStage, type HiringActor, type JobOpening, type OfferStatus } from "./types";

export function isAdminActor(actor: HiringActor): boolean {
  return hasSystemModuleRole(actor, "hiring");
}

export function actorEmployeeId(actor: HiringActor): string {
  return actor.employeeId || actor.id;
}

export function canAccessHiring(actor: HiringActor, isHiringManager: boolean, isInterviewer: boolean): boolean {
  if (isAdminActor(actor)) return true;
  return isHiringManager || isInterviewer;
}

export function canManageJobs(actor: HiringActor): boolean {
  return isAdminActor(actor);
}

export function canManageCandidates(actor: HiringActor): boolean {
  return isAdminActor(actor);
}

export function canMoveCandidates(actor: HiringActor, isHiringManager: boolean): boolean {
  return isAdminActor(actor) || isHiringManager;
}

export function canScheduleInterviews(actor: HiringActor): boolean {
  return isAdminActor(actor);
}

export function canManageOffers(actor: HiringActor): boolean {
  return isAdminActor(actor);
}

export function canConvertToEmployee(actor: HiringActor): boolean {
  return isAdminActor(actor);
}

export function canViewJob(
  actor: HiringActor,
  job: Pick<JobOpening, "id" | "hiringManagerId" | "recruiterOwnerId">,
  interviewerJobIds: Set<string>,
): boolean {
  if (isAdminActor(actor)) return true;
  const self = actorEmployeeId(actor);
  if (job.hiringManagerId === self || job.recruiterOwnerId === self) return true;
  return interviewerJobIds.has(job.id);
}

export function canViewCandidate(
  actor: HiringActor,
  candidate: Pick<Candidate, "recruiterOwnerId" | "appliedJobId" | "id">,
  hiringManagerJobIds: Set<string>,
  assignedCandidateIds: Set<string>,
): boolean {
  if (isAdminActor(actor)) return true;
  const self = actorEmployeeId(actor);
  if (candidate.recruiterOwnerId === self) return true;
  if (candidate.appliedJobId && hiringManagerJobIds.has(candidate.appliedJobId)) return true;
  return assignedCandidateIds.has(candidate.id);
}

export function canSubmitScorecard(
  actor: HiringActor,
  interviewerIds: string[],
  hiringManagerId?: string | null,
): boolean {
  if (isAdminActor(actor)) return true;
  const self = actorEmployeeId(actor);
  return interviewerIds.includes(self) || hiringManagerId === self;
}

export const PIPELINE_STAGES: CandidateStage[] = CANDIDATE_STAGES.filter((s) => s !== "rejected");

export const ACTIVE_PIPELINE_STAGES: CandidateStage[] = CANDIDATE_STAGES.filter(
  (s) => s !== "hired" && s !== "rejected",
);

const FORWARD: Partial<Record<CandidateStage, CandidateStage[]>> = {
  sourced: ["resume_reviewed", "phone_screen", "rejected"],
  resume_reviewed: ["phone_screen", "assessment", "rejected"],
  phone_screen: ["assessment", "interview_r1", "rejected"],
  assessment: ["interview_r1", "rejected"],
  interview_r1: ["interview_r2", "final_interview", "rejected"],
  interview_r2: ["final_interview", "offer_extended", "rejected"],
  final_interview: ["offer_extended", "rejected"],
  offer_extended: ["offer_accepted", "rejected"],
  offer_accepted: ["hired", "rejected"],
  hired: [],
  rejected: ["sourced", "resume_reviewed"],
};

/** Pipeline moves are allowed in any direction for SMB flexibility; terminals are special-cased. */
export function canMoveToStage(from: CandidateStage, to: CandidateStage): boolean {
  if (from === to) return false;
  if (from === "hired" && to !== "rejected") return false;
  return true;
}

export function suggestedNextStages(from: CandidateStage): CandidateStage[] {
  return FORWARD[from] ?? [];
}

export function statusForStage(stage: CandidateStage, keepInTalentPool: boolean): Candidate["status"] {
  if (stage === "hired") return "hired";
  if (stage === "rejected") return keepInTalentPool ? "talent_pool" : "rejected";
  if (stage === "offer_accepted") return "active";
  return "active";
}

export function offerImpliesStage(status: OfferStatus): CandidateStage | null {
  if (status === "sent" || status === "pending_approval") return "offer_extended";
  if (status === "accepted") return "offer_accepted";
  if (status === "rejected") return "rejected";
  return null;
}

export const STUCK_STAGE_DAYS = 14;
export const AGING_STAGE_DAYS = 7;
export const FEEDBACK_OVERDUE_HOURS = 24;
export const INTERVIEW_REMINDER_HOURS = 24;
export const TARGET_HIRE_WARNING_DAYS = 14;

export function isTerminalStage(stage: CandidateStage): boolean {
  return stage === "hired" || stage === "rejected";
}
