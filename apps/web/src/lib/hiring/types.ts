export const JOB_STATUSES = ["draft", "open", "paused", "closed", "filled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type JobPriority = (typeof JOB_PRIORITIES)[number];

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const CANDIDATE_STAGES = [
  "sourced",
  "resume_reviewed",
  "phone_screen",
  "assessment",
  "interview_r1",
  "interview_r2",
  "final_interview",
  "offer_extended",
  "offer_accepted",
  "hired",
  "rejected",
] as const;
export type CandidateStage = (typeof CANDIDATE_STAGES)[number];

export const CANDIDATE_SOURCES = [
  "careers_page",
  "referral",
  "linkedin",
  "job_board",
  "recruiter_upload",
  "walk_in",
  "agency",
  "internal_transfer",
] as const;
export type CandidateSource = (typeof CANDIDATE_SOURCES)[number];

export const CANDIDATE_STATUSES = [
  "active",
  "on_hold",
  "hired",
  "rejected",
  "withdrawn",
  "talent_pool",
] as const;
export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

export const INTERVIEW_TYPES = [
  "phone_screen",
  "assessment_review",
  "technical",
  "hiring_manager",
  "panel",
  "final",
  "culture",
] as const;
export type InterviewType = (typeof INTERVIEW_TYPES)[number];

export const INTERVIEW_MODES = ["onsite", "phone", "online"] as const;
export type InterviewMode = (typeof INTERVIEW_MODES)[number];

export const INTERVIEW_STATUSES = [
  "scheduled",
  "confirmed",
  "rescheduled",
  "completed",
  "no_show",
  "cancelled",
] as const;
export type InterviewStatus = (typeof INTERVIEW_STATUSES)[number];

export const INTERVIEW_OUTCOMES = ["pending", "advance", "hold", "reject"] as const;
export type InterviewOutcome = (typeof INTERVIEW_OUTCOMES)[number];

export const RECOMMENDATIONS = ["strong_yes", "yes", "maybe", "no"] as const;
export type Recommendation = (typeof RECOMMENDATIONS)[number];

export const OFFER_STATUSES = ["draft", "pending_approval", "sent", "accepted", "rejected", "expired"] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const NOTE_VISIBILITY = ["recruiter", "hiring_manager", "interviewer", "internal"] as const;
export type NoteVisibility = (typeof NOTE_VISIBILITY)[number];

export const COMM_EVENTS = [
  "application_received",
  "interview_invitation",
  "reminder",
  "rejection",
  "offer_sent",
  "follow_up",
  "status_update",
] as const;
export type CommEvent = (typeof COMM_EVENTS)[number];

export const HIRING_ALERT_KINDS = [
  "stuck_in_stage",
  "feedback_overdue",
  "offer_awaiting_approval",
  "upcoming_interview",
  "no_show_followup",
  "requisition_target",
] as const;
export type HiringAlertKind = (typeof HIRING_ALERT_KINDS)[number];

export const ACTIVITY_KINDS = [
  "created",
  "stage_moved",
  "note",
  "interview_scheduled",
  "interview_rescheduled",
  "scorecard",
  "offer",
  "communication",
  "attachment",
  "converted",
  "rejected",
  "status",
  "best_fit",
  "removed",
] as const;
export type HiringActivityKind = (typeof ACTIVITY_KINDS)[number];

export type ScreeningQuestionType = "yes_no" | "text" | "number";

export type ScreeningQuestion = {
  id: string;
  prompt: string;
  type: ScreeningQuestionType;
  required: boolean;
  knockout: boolean;
  expectedAnswer?: string | null;
};

export type ScreeningAnswer = {
  questionId: string;
  answer: string;
  knockoutFailed: boolean;
};

export type ParsedResume = {
  fullName: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  yearsOfExperience: number | null;
  education: string | null;
  summary: string | null;
  source: "placeholder" | "manual" | "extracted";
};

export type BestFitDraft = {
  id: string;
  candidateId: string;
  jobId: string | null;
  jobTitle: string;
  department: string;
  fitScore: number | null;
  note: string;
  savedByName: string;
  savedAt: string;
};

export type StageDefinition = {
  id: CandidateStage;
  label: string;
  sortOrder: number;
  terminal: boolean;
  agingDays: number;
};

export type JobOpening = {
  id: string;
  title: string;
  department: string;
  branchId: string;
  branchName: string;
  location: string;
  employmentType: EmploymentType;
  openingsCount: number;
  filledCount: number;
  hiringManagerId: string;
  hiringManagerName: string;
  recruiterOwnerId: string;
  recruiterOwnerName: string;
  priority: JobPriority;
  status: JobStatus;
  openedAt: string | null;
  targetHireDate: string | null;
  closedAt: string | null;
  salaryRangeMin: number | null;
  salaryRangeMax: number | null;
  currency: string;
  description: string;
  requirements: string;
  responsibilities: string;
  screeningQuestions: ScreeningQuestion[];
  createdAt: string;
  updatedAt: string;
};

export type JobOpeningDraft = {
  title: string;
  department: string;
  branchId: string;
  location: string;
  employmentType: EmploymentType;
  openingsCount: number;
  hiringManagerId: string;
  recruiterOwnerId: string;
  priority: JobPriority;
  status: JobStatus;
  openedAt: string;
  targetHireDate: string;
  salaryRangeMin: string;
  salaryRangeMax: string;
  description: string;
  requirements: string;
  responsibilities: string;
  screeningQuestions: ScreeningQuestion[];
};

export type StageHistoryEntry = {
  stage: CandidateStage;
  enteredAt: string;
  leftAt: string | null;
  movedById: string;
  movedByName: string;
};

export type CandidateNote = {
  id: string;
  candidateId: string;
  visibility: NoteVisibility;
  authorId: string;
  authorName: string;
  body: string;
  mentionPlaceholder: boolean;
  createdAt: string;
};

export type CandidateAttachment = {
  id: string;
  candidateId: string;
  name: string;
  kind: "resume" | "cover_letter" | "other";
  url: string;
  uploadedByName: string;
  uploadedAt: string;
};

export type Candidate = {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  appliedJobId: string | null;
  appliedJobTitle: string;
  source: CandidateSource;
  currentStage: CandidateStage;
  rating: number;
  yearsOfExperience: number;
  skills: string[];
  tags: string[];
  expectedSalary: number | null;
  noticePeriod: string;
  availability: string;
  locationPreference: string;
  resumeUrl: string | null;
  coverLetterUrl: string | null;
  parsedResume: ParsedResume | null;
  screeningAnswers: ScreeningAnswer[];
  assessmentStatus: "not_sent" | "pending" | "completed" | "expired";
  assessmentScore: number | null;
  recruiterOwnerId: string;
  recruiterOwnerName: string;
  status: CandidateStatus;
  keepInTalentPool: boolean;
  nationalId: string | null;
  dateOfBirth: string | null;
  address: string | null;
  convertedEmployeeId: string | null;
  convertedAt: string | null;
  stageHistory: StageHistoryEntry[];
  notes: CandidateNote[];
  attachments: CandidateAttachment[];
  createdAt: string;
  updatedAt: string;
  hiredAt: string | null;
  rejectedAt: string | null;
};

export type CandidateDraft = {
  fullName: string;
  email: string;
  phone: string;
  appliedJobId: string;
  source: CandidateSource;
  yearsOfExperience: string;
  skills: string;
  tags: string;
  expectedSalary: string;
  noticePeriod: string;
  availability: string;
  locationPreference: string;
  resumeUrl: string;
  coverLetterUrl: string;
  recruiterOwnerId: string;
  parsedResume?: ParsedResume | null;
  resumeFileName?: string;
};

export type Interview = {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string | null;
  jobTitle: string;
  stage: CandidateStage;
  type: InterviewType;
  scheduledAt: string;
  durationMinutes: number;
  mode: InterviewMode;
  interviewerIds: string[];
  interviewerNames: string[];
  status: InterviewStatus;
  confirmationStatus: "pending" | "confirmed" | "declined";
  meetingLink: string | null;
  location: string | null;
  notes: string;
  outcome: InterviewOutcome;
  createdAt: string;
  updatedAt: string;
};

export type InterviewDraft = {
  candidateId: string;
  type: InterviewType;
  scheduledAt: string;
  durationMinutes: number;
  mode: InterviewMode;
  interviewerIds: string[];
  meetingLink: string;
  location: string;
  notes: string;
};

export type ScorecardCriterion = {
  id: string;
  label: string;
  score: number;
};

export type InterviewScorecard = {
  id: string;
  interviewId: string;
  candidateId: string;
  interviewerId: string;
  interviewerName: string;
  technicalScore: number;
  communicationScore: number;
  cultureFitScore: number;
  criteria: ScorecardCriterion[];
  recommendation: Recommendation;
  comments: string;
  hiringManagerNote: string;
  submittedAt: string;
};

export type Offer = {
  id: string;
  candidateId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  offeredTitle: string;
  offeredSalary: number;
  currency: string;
  benefitsNotes: string;
  offerDate: string;
  expiryDate: string;
  expectedJoinDate: string;
  status: OfferStatus;
  notes: string;
  negotiationNotes: string;
  approvedBy: string | null;
  approvedByName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OfferDraft = {
  candidateId: string;
  offeredTitle: string;
  offeredSalary: string;
  benefitsNotes: string;
  offerDate: string;
  expiryDate: string;
  expectedJoinDate: string;
  notes: string;
};

export type CommunicationTemplate = {
  id: string;
  event: CommEvent;
  name: string;
  subject: string;
  body: string;
};

export type CommunicationRecord = {
  id: string;
  candidateId: string;
  event: CommEvent;
  subject: string;
  body: string;
  channel: "email";
  status: "logged" | "sent" | "failed";
  actorId: string;
  actorName: string;
  sentAt: string;
};

export type HiringActivityEvent = {
  id: string;
  candidateId: string | null;
  jobId: string | null;
  kind: HiringActivityKind;
  actorId: string;
  actorName: string;
  at: string;
  note: string;
  meta?: Record<string, string | number | boolean | null>;
};

export type HiringAlert = {
  id: string;
  kind: HiringAlertKind;
  severity: "info" | "warning" | "urgent";
  title: string;
  detail: string;
  candidateId: string | null;
  jobId: string | null;
  interviewId: string | null;
  offerId: string | null;
};

export type HiringTeamMember = {
  id: string;
  name: string;
  email?: string | null;
  role: string;
  department: string;
  branchId: string;
  branchName: string;
};

export type HiringBranch = {
  id: string;
  name: string;
};

export type CandidateFilters = {
  search: string;
  jobId: string;
  department: string;
  source: CandidateSource | "";
  recruiterId: string;
  stage: CandidateStage | "";
  status: CandidateStatus | "";
  tag: string;
  view: "all" | "mine" | "needs_feedback" | "offers" | "talent_pool";
};

export type HiringActor = {
  id: string;
  name: string;
  role: "super_admin" | "tenant_admin" | "employee";
  employeeId?: string | null;
  systemModuleRoles?: Array<"kpis" | "leaves" | "hiring" | "compensation" | "tasks"> | null;
};

export type StageCount = {
  stage: CandidateStage;
  label: string;
  count: number;
  avgDays: number | null;
};

export type SourceStat = {
  source: CandidateSource;
  candidates: number;
  hired: number;
  hireRate: number;
};

export type StageConversion = {
  from: CandidateStage;
  to: CandidateStage;
  entered: number;
  converted: number;
  rate: number;
};

export type RecruitmentMetricSummary = {
  openPositions: number;
  openingsHeadcount: number;
  candidatesInPipeline: number;
  interviewsToday: number;
  offersPending: number;
  hiresThisMonth: number;
  avgTimeToHireDays: number | null;
  avgTimeToFillDays: number | null;
  bottleneckCount: number;
  offerAcceptanceRate: number | null;
  interviewToOfferRate: number | null;
  stageCounts: StageCount[];
  sourcePerformance: SourceStat[];
  stageConversion: StageConversion[];
  timeInStage: Array<{ stage: CandidateStage; label: string; avgDays: number }>;
};

export type EmployeeConvertDraft = {
  name: string;
  email: string;
  phone: string;
  jobTitle: string;
  hireDate: string;
  nationalId: string;
  dateOfBirth: string;
  address: string;
  department: string;
  branchId: string;
};
