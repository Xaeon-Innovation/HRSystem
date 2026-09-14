import { fitScore, type FitScoreResult } from "./fit-score";
import { buildHiringSummary, currentStageEnteredAt } from "./reports";
import {
  addDaysIso,
  daysBetween,
  daysInStageNow,
  formatDateTime,
  hoursBetween,
  newId,
  parseSkillList,
  sameDay,
  stageLabel,
  todayIso,
} from "./format";
import {
  DEFAULT_STAGES,
  MOCK_ACTIVITY,
  MOCK_BRANCHES,
  MOCK_CANDIDATES,
  MOCK_COMMS,
  MOCK_INTERVIEWS,
  MOCK_JOBS,
  MOCK_OFFERS,
  MOCK_SCORECARDS,
  MOCK_TEAM,
  MOCK_TEMPLATES,
  MOCK_BEST_FIT,
} from "./mock";
import {
  AGING_STAGE_DAYS,
  FEEDBACK_OVERDUE_HOURS,
  INTERVIEW_REMINDER_HOURS,
  STUCK_STAGE_DAYS,
  TARGET_HIRE_WARNING_DAYS,
  actorEmployeeId,
  canAccessHiring,
  canManageCandidates,
  canManageJobs,
  canManageOffers,
  canMoveCandidates,
  canScheduleInterviews,
  canSubmitScorecard,
  canViewCandidate,
  canViewJob,
  isAdminActor,
  offerImpliesStage,
  statusForStage,
} from "./workflow";
import type {
  Candidate,
  CandidateDraft,
  CandidateFilters,
  CandidateNote,
  CandidateStage,
  CommunicationRecord,
  EmployeeConvertDraft,
  BestFitDraft,
  HiringActivityEvent,
  HiringActor,
  HiringAlert,
  HiringBranch,
  HiringTeamMember,
  Interview,
  InterviewDraft,
  InterviewScorecard,
  JobOpening,
  JobOpeningDraft,
  JobStatus,
  NoteVisibility,
  Offer,
  OfferDraft,
  OfferStatus,
  Recommendation,
  StageDefinition,
} from "./types";

const STORAGE_KEY = "hr_hiring_store_v2";

export type HiringSnapshot = {
  team: HiringTeamMember[];
  branches: HiringBranch[];
  stages: StageDefinition[];
  jobs: JobOpening[];
  candidates: Candidate[];
  interviews: Interview[];
  scorecards: InterviewScorecard[];
  offers: Offer[];
  templates: typeof MOCK_TEMPLATES;
  communications: CommunicationRecord[];
  activity: HiringActivityEvent[];
  bestFitDrafts: BestFitDraft[];
  /** Optimistic concurrency token from the server snapshot row. */
  version?: number;
};

/** Persisted on the server, directory (team/branches) is always re-hydrated. */
export type HiringPersistedSnapshot = Omit<HiringSnapshot, "team" | "branches">;

export function persistableHiringState(data: HiringSnapshot): HiringPersistedSnapshot {
  return {
    stages: data.stages,
    jobs: data.jobs,
    candidates: data.candidates,
    interviews: data.interviews,
    scorecards: data.scorecards,
    offers: data.offers,
    templates: data.templates,
    communications: data.communications,
    activity: data.activity,
    bestFitDrafts: data.bestFitDrafts,
  };
}

function emptySnapshot(): HiringSnapshot {
  return {
    team: structuredClone(MOCK_TEAM),
    branches: structuredClone(MOCK_BRANCHES),
    stages: structuredClone(DEFAULT_STAGES),
    jobs: structuredClone(MOCK_JOBS),
    candidates: structuredClone(MOCK_CANDIDATES),
    interviews: structuredClone(MOCK_INTERVIEWS),
    scorecards: structuredClone(MOCK_SCORECARDS),
    offers: structuredClone(MOCK_OFFERS),
    templates: structuredClone(MOCK_TEMPLATES),
    communications: structuredClone(MOCK_COMMS),
    activity: structuredClone(MOCK_ACTIVITY),
    bestFitDrafts: structuredClone(MOCK_BEST_FIT),
  };
}

/** Fresh tenant seed: structure only, no demo people/jobs. */
export function emptyServerSnapshot(): HiringSnapshot {
  return {
    team: [],
    branches: [],
    stages: structuredClone(DEFAULT_STAGES),
    jobs: [],
    candidates: [],
    interviews: [],
    scorecards: [],
    offers: [],
    templates: structuredClone(MOCK_TEMPLATES),
    communications: [],
    activity: [],
    bestFitDrafts: [],
  };
}

function loadSnapshot(): HiringSnapshot {
  if (typeof window === "undefined") return emptyServerSnapshot();
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyServerSnapshot();
    const parsed = JSON.parse(raw) as HiringSnapshot;
    if (!parsed.jobs || !parsed.candidates) return emptyServerSnapshot();
    if (!parsed.bestFitDrafts) parsed.bestFitDrafts = [];
    if (!parsed.stages?.length) parsed.stages = structuredClone(DEFAULT_STAGES);
    if (!parsed.templates?.length) parsed.templates = structuredClone(MOCK_TEMPLATES);
    return parsed;
  } catch {
    return emptyServerSnapshot();
  }
}

function saveSnapshot(data: HiringSnapshot) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore quota */
  }
}

type RemotePersistHandler = (
  snapshot: HiringPersistedSnapshot,
  expectedVersion: number,
) => void;

function nowIso() {
  return new Date().toISOString();
}

function departmentFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/sales|account/.test(t)) return "Sales";
  if (/driver|ops|coordinat|dispatch/.test(t)) return "Operations";
  if (/hr|people|admin/.test(t)) return "People";
  return "General";
}

const EMPTY_FILTERS: CandidateFilters = {
  search: "",
  jobId: "",
  department: "",
  source: "",
  recruiterId: "",
  stage: "",
  status: "",
  tag: "",
  view: "all",
};

export class HiringStore {
  private data: HiringSnapshot;
  private remotePersist: RemotePersistHandler | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private suppressRemote = false;
  private version = 1;

  constructor(seed?: HiringSnapshot) {
    this.data = seed ?? loadSnapshot();
    if (typeof this.data.version === "number") this.version = this.data.version;
  }

  /** Wire server persistence; sessionStorage remains a local cache. */
  setRemotePersist(handler: RemotePersistHandler | null) {
    this.remotePersist = handler;
  }

  getVersion() {
    return this.version;
  }

  setVersion(version: number) {
    this.version = version;
    this.data.version = version;
  }

  /** Replace local state from GET /v1/hiring (does not push back). */
  replaceFromServer(input: Partial<HiringSnapshot> & Pick<HiringSnapshot, "jobs" | "candidates">) {
    this.suppressRemote = true;
    const base = emptyServerSnapshot();
    this.data = {
      ...base,
      ...input,
      stages: input.stages?.length ? input.stages : base.stages,
      templates: input.templates?.length ? input.templates : base.templates,
      interviews: input.interviews ?? [],
      scorecards: input.scorecards ?? [],
      offers: input.offers ?? [],
      communications: input.communications ?? [],
      activity: input.activity ?? [],
      bestFitDrafts: input.bestFitDrafts ?? [],
      team: input.team ?? [],
      branches: input.branches ?? [],
      version: typeof input.version === "number" ? input.version : this.version,
    };
    if (typeof input.version === "number") this.version = input.version;
    saveSnapshot(this.data);
    this.suppressRemote = false;
  }

  private persist() {
    this.data.version = this.version;
    saveSnapshot(this.data);
    if (this.suppressRemote || !this.remotePersist) return;
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.remotePersist?.(persistableHiringState(this.data), this.version);
    }, 350);
  }

  snapshot(): HiringSnapshot {
    return this.data;
  }

  resetDemo() {
    this.data = emptySnapshot();
    this.persist();
  }

  hydrateDirectory(input: {
    employees?: Array<{
      id: string;
      name: string;
      email?: string | null;
      jobTitle?: string | null;
      role?: string;
      branchId?: string | null;
    }>;
    branches?: Array<{ id: string; name: string }>;
    current?: HiringActor | null;
  }) {
    const branchNames = new Map((input.branches ?? []).map((b) => [b.id, b.name]));
    if (input.branches?.length) {
      for (const b of input.branches) {
        if (!this.data.branches.some((x) => x.id === b.id)) {
          this.data.branches.push({ id: b.id, name: b.name });
        }
      }
    }
    const existing = new Map(this.data.team.map((t) => [t.id, t]));
    for (const emp of input.employees ?? []) {
      if (existing.has(emp.id)) {
        const prev = existing.get(emp.id)!;
        prev.name = emp.name;
        prev.email = emp.email ?? prev.email;
        prev.role = emp.jobTitle || emp.role || prev.role;
        prev.department = departmentFromTitle(emp.jobTitle || emp.role || prev.department);
        if (emp.branchId) {
          prev.branchId = emp.branchId;
          prev.branchName = branchNames.get(emp.branchId) ?? prev.branchName;
        }
        continue;
      }
      this.data.team.push({
        id: emp.id,
        name: emp.name,
        email: emp.email ?? null,
        role: emp.jobTitle || emp.role || "Employee",
        department: departmentFromTitle(emp.jobTitle || emp.role || ""),
        branchId: emp.branchId || this.data.branches[0]?.id || "br-hq",
        branchName: branchNames.get(emp.branchId || "") ?? this.data.branches[0]?.name ?? "HQ",
      });
    }
    if (input.current?.employeeId && !this.data.team.some((t) => t.id === input.current!.employeeId)) {
      this.data.team.push({
        id: input.current.employeeId,
        name: input.current.name,
        role: "Employee",
        department: "General",
        branchId: this.data.branches[0]?.id || "br-hq",
        branchName: this.data.branches[0]?.name ?? "HQ",
      });
    }
    // Directory is always reloaded from employees/branches APIs, cache locally only.
    saveSnapshot(this.data);
  }

  team() {
    return this.data.team;
  }

  branches() {
    return this.data.branches;
  }

  stages() {
    return [...this.data.stages].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  member(id: string) {
    return this.data.team.find((t) => t.id === id);
  }

  hiringManagerJobIds(actor: HiringActor): Set<string> {
    const self = actorEmployeeId(actor);
    return new Set(this.data.jobs.filter((j) => j.hiringManagerId === self).map((j) => j.id));
  }

  assignedCandidateIds(actor: HiringActor): Set<string> {
    const self = actorEmployeeId(actor);
    return new Set(
      this.data.interviews.filter((i) => i.interviewerIds.includes(self)).map((i) => i.candidateId),
    );
  }

  interviewerJobIds(actor: HiringActor): Set<string> {
    const ids = this.assignedCandidateIds(actor);
    const jobIds = new Set<string>();
    for (const c of this.data.candidates) {
      if (ids.has(c.id) && c.appliedJobId) jobIds.add(c.appliedJobId);
    }
    return jobIds;
  }

  isHiringManager(actor: HiringActor): boolean {
    if (isAdminActor(actor)) return true;
    return this.hiringManagerJobIds(actor).size > 0;
  }

  isInterviewer(actor: HiringActor): boolean {
    if (isAdminActor(actor)) return true;
    return this.assignedCandidateIds(actor).size > 0;
  }

  canAccess(actor: HiringActor): boolean {
    return canAccessHiring(actor, this.isHiringManager(actor), this.isInterviewer(actor));
  }

  jobs(actor?: HiringActor): JobOpening[] {
    const list = [...this.data.jobs].sort((a, b) => (b.openedAt ?? "").localeCompare(a.openedAt ?? ""));
    if (!actor || isAdminActor(actor)) return list;
    const ivJobs = this.interviewerJobIds(actor);
    return list.filter((j) => canViewJob(actor, j, ivJobs));
  }

  job(id: string) {
    return this.data.jobs.find((j) => j.id === id);
  }

  createJob(draft: JobOpeningDraft, actor: HiringActor): JobOpening {
    if (!canManageJobs(actor)) throw new Error("Only HR can create job openings.");
    const hm = this.member(draft.hiringManagerId);
    const rec = this.member(draft.recruiterOwnerId);
    const branch = this.data.branches.find((b) => b.id === draft.branchId);
    const now = nowIso();
    const job: JobOpening = {
      id: newId("job"),
      title: draft.title.trim(),
      department: draft.department.trim(),
      branchId: draft.branchId,
      branchName: branch?.name ?? draft.location,
      location: draft.location.trim() || branch?.name || "",
      employmentType: draft.employmentType,
      openingsCount: Math.max(1, Number(draft.openingsCount) || 1),
      filledCount: 0,
      hiringManagerId: draft.hiringManagerId,
      hiringManagerName: hm?.name ?? "-",
      recruiterOwnerId: draft.recruiterOwnerId,
      recruiterOwnerName: rec?.name ?? actor.name,
      priority: draft.priority,
      status: draft.status,
      openedAt: draft.status === "open" ? draft.openedAt || todayIso() : draft.openedAt || null,
      targetHireDate: draft.targetHireDate || null,
      closedAt: draft.status === "closed" || draft.status === "filled" ? todayIso() : null,
      salaryRangeMin: draft.salaryRangeMin ? Number(draft.salaryRangeMin) : null,
      salaryRangeMax: draft.salaryRangeMax ? Number(draft.salaryRangeMax) : null,
      currency: "EGP",
      description: draft.description.trim(),
      requirements: draft.requirements.trim(),
      responsibilities: draft.responsibilities.trim(),
      screeningQuestions: draft.screeningQuestions,
      createdAt: now,
      updatedAt: now,
    };
    if (!job.title) throw new Error("A job title is required.");
    this.data.jobs.unshift(job);
    this.log({
      candidateId: null,
      jobId: job.id,
      kind: "created",
      actor,
      note: `Opened “${job.title}”.`,
    });
    this.persist();
    return job;
  }

  updateJob(id: string, patch: Partial<JobOpening>, actor: HiringActor) {
    if (!canManageJobs(actor)) throw new Error("Only HR can edit job openings.");
    const job = this.job(id);
    if (!job) throw new Error("Job opening not found.");
    Object.assign(job, patch, { updatedAt: nowIso() });
    if (patch.hiringManagerId) {
      job.hiringManagerName = this.member(patch.hiringManagerId)?.name ?? job.hiringManagerName;
    }
    if (patch.recruiterOwnerId) {
      job.recruiterOwnerName = this.member(patch.recruiterOwnerId)?.name ?? job.recruiterOwnerName;
    }
    if (patch.branchId) {
      job.branchName = this.data.branches.find((b) => b.id === patch.branchId)?.name ?? job.branchName;
    }
    this.persist();
    return job;
  }

  setJobStatus(id: string, status: JobStatus, actor: HiringActor) {
    const extra: Partial<JobOpening> = { status };
    if (status === "open" && !this.job(id)?.openedAt) extra.openedAt = todayIso();
    if (status === "closed" || status === "filled") extra.closedAt = todayIso();
    return this.updateJob(id, extra, actor);
  }

  removeJob(id: string, actor: HiringActor) {
    if (!canManageJobs(actor)) throw new Error("Only HR can remove job openings.");
    const job = this.job(id);
    if (!job) throw new Error("Job not found.");
    const now = nowIso();
    for (const c of this.data.candidates) {
      if (c.appliedJobId !== id) continue;
      c.appliedJobId = null;
      c.updatedAt = now;
      if (c.currentStage === "hired" || c.convertedEmployeeId) continue;
      c.appliedJobTitle = "Talent pool";
      c.status = "talent_pool";
      c.keepInTalentPool = true;
    }
    for (const interview of this.data.interviews) {
      if (interview.jobId === id) interview.jobId = null;
    }
    for (const draft of this.data.bestFitDrafts) {
      if (draft.jobId === id) draft.jobId = null;
    }
    this.data.jobs = this.data.jobs.filter((j) => j.id !== id);
    this.log({
      candidateId: null,
      jobId: null,
      kind: "removed",
      actor,
      note: `Removed opening “${job.title}”. Remaining candidates moved to the talent pool.`,
    });
    this.persist();
  }

  candidates(filters: CandidateFilters = EMPTY_FILTERS, actor?: HiringActor): Candidate[] {
    const hmJobs = actor ? this.hiringManagerJobIds(actor) : new Set<string>();
    const assigned = actor ? this.assignedCandidateIds(actor) : new Set<string>();
    let list = this.data.candidates.filter((c) => {
      if (!actor) return true;
      return canViewCandidate(actor, c, hmJobs, assigned);
    });

    const q = filters.search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        [c.fullName, c.email, c.phone, c.appliedJobTitle, c.skills.join(" "), c.tags.join(" ")]
          .join(" ")
          .toLowerCase()
          .includes(q),
      );
    }
    if (filters.jobId) list = list.filter((c) => c.appliedJobId === filters.jobId);
    if (filters.department) {
      const jobIds = new Set(
        this.data.jobs.filter((j) => j.department === filters.department).map((j) => j.id),
      );
      list = list.filter((c) => (c.appliedJobId ? jobIds.has(c.appliedJobId) : false));
    }
    if (filters.source) list = list.filter((c) => c.source === filters.source);
    if (filters.recruiterId) list = list.filter((c) => c.recruiterOwnerId === filters.recruiterId);
    if (filters.stage) list = list.filter((c) => c.currentStage === filters.stage);
    if (filters.status) list = list.filter((c) => c.status === filters.status);
    if (filters.tag) list = list.filter((c) => c.tags.includes(filters.tag));

    if (filters.view === "mine" && actor) {
      const self = actorEmployeeId(actor);
      list = list.filter((c) => c.recruiterOwnerId === self || assigned.has(c.id) || (c.appliedJobId && hmJobs.has(c.appliedJobId)));
    }
    if (filters.view === "needs_feedback") {
      const overdue = new Set(this.feedbackOverdueInterviewIds());
      const candIds = new Set(
        this.data.interviews.filter((i) => overdue.has(i.id)).map((i) => i.candidateId),
      );
      list = list.filter((c) => candIds.has(c.id));
    }
    if (filters.view === "offers") {
      list = list.filter(
        (c) => c.currentStage === "offer_extended" || c.currentStage === "offer_accepted",
      );
    }
    if (filters.view === "talent_pool") {
      list = list.filter((c) => c.status === "talent_pool" || !c.appliedJobId);
    }

    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  candidate(id: string) {
    return this.data.candidates.find((c) => c.id === id);
  }

  duplicateIds(): Set<string> {
    const byEmail = new Map<string, string[]>();
    for (const c of this.data.candidates) {
      const key = c.email.trim().toLowerCase();
      if (!key) continue;
      const arr = byEmail.get(key) ?? [];
      arr.push(c.id);
      byEmail.set(key, arr);
    }
    const dup = new Set<string>();
    for (const ids of byEmail.values()) {
      if (ids.length > 1) ids.forEach((id) => dup.add(id));
    }
    return dup;
  }

  createCandidate(draft: CandidateDraft, actor: HiringActor): Candidate {
    if (!canManageCandidates(actor) && !isAdminActor(actor)) {
      throw new Error("Only HR can add candidates.");
    }
    const job = draft.appliedJobId ? this.job(draft.appliedJobId) : undefined;
    const rec = this.member(draft.recruiterOwnerId) ?? this.member(actorEmployeeId(actor));
    const now = nowIso();
    const stage: CandidateStage = "sourced";
    const cand: Candidate = {
      id: newId("cand"),
      fullName: draft.fullName.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      appliedJobId: draft.appliedJobId || null,
      appliedJobTitle: job?.title ?? "Talent pool",
      source: draft.source,
      currentStage: stage,
      rating: 0,
      yearsOfExperience: Number(draft.yearsOfExperience) || 0,
      skills: parseSkillList(draft.skills),
      tags: parseSkillList(draft.tags),
      expectedSalary: draft.expectedSalary ? Number(draft.expectedSalary) : null,
      noticePeriod: draft.noticePeriod.trim(),
      availability: draft.availability.trim(),
      locationPreference: draft.locationPreference.trim(),
      resumeUrl: draft.resumeUrl.trim() || null,
      coverLetterUrl: draft.coverLetterUrl.trim() || null,
      parsedResume:
        draft.parsedResume ??
        (draft.resumeUrl.trim()
          ? {
              fullName: draft.fullName.trim() || null,
              email: draft.email.trim() || null,
              phone: draft.phone.trim() || null,
              skills: parseSkillList(draft.skills),
              yearsOfExperience: Number(draft.yearsOfExperience) || null,
              education: null,
              summary: "Review extracted or typed fields before you rely on them.",
              source: "placeholder" as const,
            }
          : null),
      screeningAnswers: [],
      assessmentStatus: "not_sent",
      assessmentScore: null,
      recruiterOwnerId: rec?.id ?? actorEmployeeId(actor),
      recruiterOwnerName: rec?.name ?? actor.name,
      status: job ? "active" : "talent_pool",
      keepInTalentPool: true,
      nationalId: null,
      dateOfBirth: null,
      address: null,
      convertedEmployeeId: null,
      convertedAt: null,
      stageHistory: [
        {
          stage,
          enteredAt: now,
          leftAt: null,
          movedById: actor.id,
          movedByName: actor.name,
        },
      ],
      notes: [],
      attachments: draft.resumeUrl
        ? [
            {
              id: newId("att"),
              candidateId: "",
              name: draft.resumeFileName?.trim() || "resume.pdf",
              kind: "resume",
              url: draft.resumeUrl.trim(),
              uploadedByName: actor.name,
              uploadedAt: now,
            },
          ]
        : [],
      createdAt: now,
      updatedAt: now,
      hiredAt: null,
      rejectedAt: null,
    };
    if (!cand.fullName) throw new Error("Candidate name is required.");
    cand.attachments = cand.attachments.map((a) => ({ ...a, candidateId: cand.id }));
    this.data.candidates.unshift(cand);
    this.log({
      candidateId: cand.id,
      jobId: cand.appliedJobId,
      kind: "created",
      actor,
      note: `Added ${cand.fullName}.`,
    });
    this.persist();
    return cand;
  }

  updateCandidate(id: string, patch: Partial<Candidate>, actor: HiringActor) {
    if (!canManageCandidates(actor) && !this.isHiringManager(actor)) {
      throw new Error("You cannot edit this candidate.");
    }
    const c = this.candidate(id);
    if (!c) throw new Error("Candidate not found.");
    Object.assign(c, patch, { updatedAt: nowIso() });
    this.persist();
    return c;
  }

  moveCandidate(id: string, to: CandidateStage, actor: HiringActor, note = "") {
    if (!canMoveCandidates(actor, this.isHiringManager(actor))) {
      throw new Error("You cannot move candidates between stages.");
    }
    const c = this.candidate(id);
    if (!c) throw new Error("Candidate not found.");
    if (c.currentStage === to) return c;
    const now = nowIso();
    const open = c.stageHistory.find((h) => h.stage === c.currentStage && !h.leftAt);
    if (open) open.leftAt = now;
    c.stageHistory.push({
      stage: to,
      enteredAt: now,
      leftAt: null,
      movedById: actor.id,
      movedByName: actor.name,
    });
    c.currentStage = to;
    c.status = statusForStage(to, c.keepInTalentPool);
    c.updatedAt = now;
    if (to === "hired") c.hiredAt = now;
    if (to === "rejected") c.rejectedAt = now;
    this.log({
      candidateId: c.id,
      jobId: c.appliedJobId,
      kind: "stage_moved",
      actor,
      note: note || `Moved to ${stageLabel(to)}.`,
      meta: { stage: to },
    });
    this.persist();
    return c;
  }

  rejectCandidate(id: string, actor: HiringActor, keepInTalentPool: boolean, reason: string) {
    const c = this.updateCandidate(id, { keepInTalentPool }, actor);
    this.moveCandidate(id, "rejected", actor, reason);
    this.log({
      candidateId: c.id,
      jobId: c.appliedJobId,
      kind: "rejected",
      actor,
      note: reason,
    });
    this.persist();
    return c;
  }

  removeCandidate(id: string, actor: HiringActor) {
    if (!canManageCandidates(actor)) throw new Error("Only HR can remove candidates.");
    const c = this.candidate(id);
    if (!c) throw new Error("Candidate not found.");
    this.data.candidates = this.data.candidates.filter((x) => x.id !== id);
    this.data.interviews = this.data.interviews.filter((x) => x.candidateId !== id);
    this.data.scorecards = this.data.scorecards.filter((x) => x.candidateId !== id);
    this.data.offers = this.data.offers.filter((x) => x.candidateId !== id);
    this.data.communications = this.data.communications.filter((x) => x.candidateId !== id);
    this.data.activity = this.data.activity.filter((x) => x.candidateId !== id);
    this.data.bestFitDrafts = this.data.bestFitDrafts.filter((x) => x.candidateId !== id);
    this.log({
      candidateId: null,
      jobId: c.appliedJobId,
      kind: "removed",
      actor,
      note: `Removed candidate ${c.fullName}.`,
    });
    this.persist();
  }

  fitFor(candidate: Candidate): FitScoreResult {
    const job = candidate.appliedJobId ? this.job(candidate.appliedJobId) ?? null : null;
    return fitScore(candidate, job, this.scorecardsForCandidate(candidate.id));
  }

  bestFitDrafts(actor?: HiringActor): BestFitDraft[] {
    if (actor && !this.canAccess(actor)) return [];
    return [...this.data.bestFitDrafts].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }

  saveBestFit(candidateId: string, actor: HiringActor, note = "") {
    if (!canManageCandidates(actor)) throw new Error("Only HR can save best-fit drafts.");
    const c = this.candidate(candidateId);
    if (!c) throw new Error("Candidate not found.");
    const job = c.appliedJobId ? this.job(c.appliedJobId) : undefined;
    const fit = this.fitFor(c);
    const now = nowIso();
    const existing = this.data.bestFitDrafts.find(
      (d) => d.candidateId === candidateId && (d.jobId ?? null) === (c.appliedJobId ?? null),
    );
    if (existing) {
      existing.fitScore = fit.score;
      existing.note = note.trim() || existing.note;
      existing.savedByName = actor.name;
      existing.savedAt = now;
      existing.jobTitle = job?.title ?? c.appliedJobTitle;
      existing.department = job?.department ?? existing.department;
      this.log({
        candidateId: c.id,
        jobId: c.appliedJobId,
        kind: "best_fit",
        actor,
        note: existing.note || `Updated best-fit draft for ${c.fullName}.`,
      });
      this.persist();
      return existing;
    }
    const draft: BestFitDraft = {
      id: newId("bf"),
      candidateId: c.id,
      jobId: c.appliedJobId,
      jobTitle: job?.title ?? c.appliedJobTitle,
      department: job?.department ?? departmentFromTitle(c.appliedJobTitle),
      fitScore: fit.score,
      note: note.trim(),
      savedByName: actor.name,
      savedAt: now,
    };
    this.data.bestFitDrafts.unshift(draft);
    this.log({
      candidateId: c.id,
      jobId: c.appliedJobId,
      kind: "best_fit",
      actor,
      note: draft.note || `Saved ${c.fullName} as best fit.`,
    });
    this.persist();
    return draft;
  }

  removeBestFit(id: string, actor: HiringActor) {
    if (!canManageCandidates(actor)) throw new Error("Only HR can update the best-fit bench.");
    this.data.bestFitDrafts = this.data.bestFitDrafts.filter((d) => d.id !== id);
    this.persist();
  }

  attachBestFit(draftId: string, jobId: string, actor: HiringActor) {
    if (!canManageCandidates(actor)) throw new Error("Only HR can attach best-fit drafts.");
    const draft = this.data.bestFitDrafts.find((d) => d.id === draftId);
    if (!draft) throw new Error("Best-fit draft not found.");
    const job = this.job(jobId);
    if (!job) throw new Error("Job not found.");
    if (job.status !== "open") throw new Error("Pick an open job opening.");
    const c = this.candidate(draft.candidateId);
    if (!c) throw new Error("Candidate not found.");
    this.updateCandidate(
      c.id,
      {
        appliedJobId: job.id,
        appliedJobTitle: job.title,
        status: "active",
      },
      actor,
    );
    this.moveCandidate(c.id, "sourced", actor, `Attached from best-fit bench to ${job.title}.`);
    draft.jobId = job.id;
    draft.jobTitle = job.title;
    draft.department = job.department;
    const attached = this.candidate(c.id)!;
    draft.fitScore = this.fitFor(attached).score;
    this.persist();
    return attached;
  }

  addNote(candidateId: string, body: string, visibility: NoteVisibility, actor: HiringActor) {
    const c = this.candidate(candidateId);
    if (!c) throw new Error("Candidate not found.");
    const n: CandidateNote = {
      id: newId("note"),
      candidateId,
      visibility,
      authorId: actor.id,
      authorName: actor.name,
      body: body.trim(),
      mentionPlaceholder: body.includes("@"),
      createdAt: nowIso(),
    };
    if (!n.body) throw new Error("Write a note first.");
    c.notes.push(n);
    c.updatedAt = n.createdAt;
    this.log({
      candidateId,
      jobId: c.appliedJobId,
      kind: "note",
      actor,
      note: n.body,
    });
    this.persist();
    return n;
  }

  addAttachment(
    candidateId: string,
    input: { name: string; url: string; kind: Candidate["attachments"][number]["kind"] },
    actor: HiringActor,
  ) {
    const c = this.candidate(candidateId);
    if (!c) throw new Error("Candidate not found.");
    const att = {
      id: newId("att"),
      candidateId,
      name: input.name.trim() || "attachment",
      kind: input.kind,
      url: input.url.trim() || `#file-${newId("file")}`,
      uploadedByName: actor.name,
      uploadedAt: nowIso(),
    };
    c.attachments.push(att);
    if (att.kind === "resume") {
      c.resumeUrl = att.url;
      c.parsedResume = {
        fullName: c.fullName,
        email: c.email,
        phone: c.phone,
        skills: c.skills,
        yearsOfExperience: c.yearsOfExperience,
        education: c.parsedResume?.education ?? null,
        summary: "Parsed placeholder, confirm name, skills, and years of experience.",
        source: "placeholder",
      };
    }
    if (att.kind === "cover_letter") c.coverLetterUrl = att.url;
    c.updatedAt = att.uploadedAt;
    this.log({
      candidateId,
      jobId: c.appliedJobId,
      kind: "attachment",
      actor,
      note: `Uploaded ${att.name}.`,
    });
    this.persist();
    return att;
  }

  setRating(candidateId: string, rating: number, actor: HiringActor) {
    return this.updateCandidate(candidateId, { rating: Math.max(0, Math.min(5, rating)) }, actor);
  }

  setTags(candidateId: string, tags: string[], actor: HiringActor) {
    return this.updateCandidate(candidateId, { tags }, actor);
  }

  interviews(actor?: HiringActor): Interview[] {
    const assigned = actor && !isAdminActor(actor) ? this.assignedCandidateIds(actor) : null;
    const hmJobs = actor ? this.hiringManagerJobIds(actor) : new Set<string>();
    let list = [...this.data.interviews];
    if (actor && !isAdminActor(actor)) {
      const self = actorEmployeeId(actor);
      list = list.filter((i) => {
        if (i.interviewerIds.includes(self)) return true;
        if (i.jobId && hmJobs.has(i.jobId)) return true;
        if (assigned?.has(i.candidateId)) return true;
        return false;
      });
    }
    return list.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  }

  interview(id: string) {
    return this.data.interviews.find((i) => i.id === id);
  }

  scheduleInterview(draft: InterviewDraft, actor: HiringActor): Interview {
    if (!canScheduleInterviews(actor) && !this.isHiringManager(actor)) {
      throw new Error("You cannot schedule interviews.");
    }
    const c = this.candidate(draft.candidateId);
    if (!c) throw new Error("Candidate not found.");
    const interviewers = draft.interviewerIds
      .map((id) => this.member(id))
      .filter((m): m is HiringTeamMember => Boolean(m));
    const now = nowIso();
    const row: Interview = {
      id: newId("int"),
      candidateId: c.id,
      candidateName: c.fullName,
      jobId: c.appliedJobId,
      jobTitle: c.appliedJobTitle,
      stage: c.currentStage,
      type: draft.type,
      scheduledAt: draft.scheduledAt,
      durationMinutes: draft.durationMinutes || 30,
      mode: draft.mode,
      interviewerIds: interviewers.map((m) => m.id),
      interviewerNames: interviewers.map((m) => m.name),
      status: "scheduled",
      confirmationStatus: "pending",
      meetingLink: draft.meetingLink.trim() || null,
      location: draft.location.trim() || null,
      notes: draft.notes.trim(),
      outcome: "pending",
      createdAt: now,
      updatedAt: now,
    };
    if (!row.scheduledAt) throw new Error("Pick a date and time.");
    if (!row.interviewerIds.length) throw new Error("Assign at least one interviewer.");
    this.data.interviews.push(row);
    c.updatedAt = now;
    this.log({
      candidateId: c.id,
      jobId: c.appliedJobId,
      kind: "interview_scheduled",
      actor,
      note: `Scheduled ${formatDateTime(row.scheduledAt)}.`,
    });
    this.persist();
    return row;
  }

  rescheduleInterview(id: string, scheduledAt: string, actor: HiringActor) {
    const row = this.interview(id);
    if (!row) throw new Error("Interview not found.");
    row.scheduledAt = scheduledAt;
    row.status = "rescheduled";
    row.confirmationStatus = "pending";
    row.updatedAt = nowIso();
    this.log({
      candidateId: row.candidateId,
      jobId: row.jobId,
      kind: "interview_rescheduled",
      actor,
      note: `Rescheduled to ${formatDateTime(scheduledAt)}.`,
    });
    this.persist();
    return row;
  }

  setInterviewStatus(
    id: string,
    patch: Partial<Pick<Interview, "status" | "confirmationStatus" | "outcome" | "notes">>,
    actor: HiringActor,
  ) {
    const row = this.interview(id);
    if (!row) throw new Error("Interview not found.");
    Object.assign(row, patch, { updatedAt: nowIso() });
    this.persist();
    return row;
  }

  markNoShow(id: string, actor: HiringActor) {
    return this.setInterviewStatus(id, { status: "no_show", outcome: "hold" }, actor);
  }

  scorecardsFor(interviewId: string) {
    return this.data.scorecards.filter((s) => s.interviewId === interviewId);
  }

  scorecardsForCandidate(candidateId: string) {
    return this.data.scorecards.filter((s) => s.candidateId === candidateId);
  }

  submitScorecard(
    input: {
      interviewId: string;
      technicalScore: number;
      communicationScore: number;
      cultureFitScore: number;
      criteria: InterviewScorecard["criteria"];
      recommendation: Recommendation;
      comments: string;
      hiringManagerNote: string;
    },
    actor: HiringActor,
  ): InterviewScorecard {
    const interview = this.interview(input.interviewId);
    if (!interview) throw new Error("Interview not found.");
    const job = interview.jobId ? this.job(interview.jobId) : undefined;
    if (!canSubmitScorecard(actor, interview.interviewerIds, job?.hiringManagerId)) {
      throw new Error("You can only score interviews assigned to you.");
    }
    const existing = this.data.scorecards.find(
      (s) => s.interviewId === input.interviewId && s.interviewerId === actorEmployeeId(actor),
    );
    const now = nowIso();
    const card: InterviewScorecard = {
      id: existing?.id ?? newId("sc"),
      interviewId: interview.id,
      candidateId: interview.candidateId,
      interviewerId: actorEmployeeId(actor),
      interviewerName: actor.name,
      technicalScore: input.technicalScore,
      communicationScore: input.communicationScore,
      cultureFitScore: input.cultureFitScore,
      criteria: input.criteria,
      recommendation: input.recommendation,
      comments: input.comments.trim(),
      hiringManagerNote: input.hiringManagerNote.trim(),
      submittedAt: now,
    };
    if (existing) {
      Object.assign(existing, card);
    } else {
      this.data.scorecards.push(card);
    }
    interview.status = "completed";
    interview.updatedAt = now;
    const c = this.candidate(interview.candidateId);
    if (c) c.updatedAt = now;
    this.log({
      candidateId: interview.candidateId,
      jobId: interview.jobId,
      kind: "scorecard",
      actor,
      note: `Scorecard: ${card.recommendation.replace("_", " ")}.`,
    });
    this.persist();
    return card;
  }

  offers(actor?: HiringActor): Offer[] {
    const jobs = new Set(this.jobs(actor).map((j) => j.id));
    let list = [...this.data.offers];
    if (actor && !isAdminActor(actor)) {
      list = list.filter((o) => jobs.has(o.jobId));
    }
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  offer(id: string) {
    return this.data.offers.find((o) => o.id === id);
  }

  offerForCandidate(candidateId: string) {
    return this.data.offers
      .filter((o) => o.candidateId === candidateId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }

  createOffer(draft: OfferDraft, actor: HiringActor): Offer {
    if (!canManageOffers(actor)) throw new Error("Only HR can create offers.");
    const c = this.candidate(draft.candidateId);
    if (!c) throw new Error("Candidate not found.");
    if (!c.appliedJobId) throw new Error("Attach the candidate to a job opening first.");
    const job = this.job(c.appliedJobId);
    if (!job) throw new Error("Job opening not found.");
    const now = nowIso();
    const offer: Offer = {
      id: newId("off"),
      candidateId: c.id,
      candidateName: c.fullName,
      jobId: job.id,
      jobTitle: job.title,
      offeredTitle: draft.offeredTitle.trim() || job.title,
      offeredSalary: Number(draft.offeredSalary) || 0,
      currency: job.currency,
      benefitsNotes: draft.benefitsNotes.trim(),
      offerDate: draft.offerDate || todayIso(),
      expiryDate: draft.expiryDate || addDaysIso(todayIso(), 14),
      expectedJoinDate: draft.expectedJoinDate || "",
      status: "draft",
      notes: draft.notes.trim(),
      negotiationNotes: "",
      approvedBy: null,
      approvedByName: null,
      createdAt: now,
      updatedAt: now,
    };
    if (!offer.offeredSalary) throw new Error("Enter an offered salary.");
    this.data.offers.unshift(offer);
    this.log({
      candidateId: c.id,
      jobId: job.id,
      kind: "offer",
      actor,
      note: "Offer drafted.",
    });
    this.persist();
    return offer;
  }

  setOfferStatus(id: string, status: OfferStatus, actor: HiringActor, negotiationNotes?: string) {
    if (!canManageOffers(actor) && status !== "accepted" && status !== "rejected") {
      throw new Error("Only HR can update offers.");
    }
    const offer = this.offer(id);
    if (!offer) throw new Error("Offer not found.");
    offer.status = status;
    offer.updatedAt = nowIso();
    if (negotiationNotes != null) offer.negotiationNotes = negotiationNotes;
    if (status === "pending_approval") {
      /* wait */
    }
    if (status === "sent") {
      offer.approvedBy = offer.approvedBy ?? actor.id;
      offer.approvedByName = offer.approvedByName ?? actor.name;
    }
    const implied = offerImpliesStage(status);
    if (implied) {
      const c = this.candidate(offer.candidateId);
      if (c && c.currentStage !== implied) {
        this.moveCandidate(c.id, implied, actor, `Offer ${status.replace("_", " ")}.`);
      }
    }
    this.log({
      candidateId: offer.candidateId,
      jobId: offer.jobId,
      kind: "offer",
      actor,
      note: `Offer ${status.replace("_", " ")}.`,
    });
    this.persist();
    return offer;
  }

  approveOffer(id: string, actor: HiringActor) {
    if (!canManageOffers(actor)) throw new Error("Only HR can approve offers.");
    const offer = this.offer(id);
    if (!offer) throw new Error("Offer not found.");
    offer.approvedBy = actor.id;
    offer.approvedByName = actor.name;
    return this.setOfferStatus(id, "sent", actor);
  }

  convertDraft(candidateId: string): EmployeeConvertDraft | null {
    const c = this.candidate(candidateId);
    if (!c) return null;
    const offer = this.offerForCandidate(candidateId);
    const job = c.appliedJobId ? this.job(c.appliedJobId) : undefined;
    return {
      name: c.fullName,
      email: c.email,
      phone: c.phone,
      jobTitle: offer?.offeredTitle || c.appliedJobTitle,
      hireDate: offer?.expectedJoinDate || todayIso(),
      nationalId: c.nationalId ?? "",
      dateOfBirth: c.dateOfBirth ?? "",
      address: c.address ?? "",
      department: job?.department ?? "",
      branchId: job?.branchId ?? this.data.branches[0]?.id ?? "",
    };
  }

  markConverted(candidateId: string, employeeId: string, actor: HiringActor) {
    const c = this.candidate(candidateId);
    if (!c) throw new Error("Candidate not found.");
    const now = nowIso();
    if (c.currentStage !== "hired") {
      this.moveCandidate(candidateId, "hired", actor, "Converted to employee.");
    }
    c.convertedEmployeeId = employeeId;
    c.convertedAt = now;
    c.status = "hired";
    c.hiredAt = c.hiredAt ?? now;
    c.updatedAt = now;
    const job = c.appliedJobId ? this.job(c.appliedJobId) : undefined;
    if (job) {
      job.filledCount = Math.min(job.openingsCount, job.filledCount + 1);
      if (job.filledCount >= job.openingsCount) {
        job.status = "filled";
        job.closedAt = todayIso();
      }
      job.updatedAt = now;
    }
    this.log({
      candidateId: c.id,
      jobId: c.appliedJobId,
      kind: "converted",
      actor,
      note: "Converted to an employee record.",
      meta: { employeeId },
    });
    this.persist();
    return c;
  }

  templates() {
    return this.data.templates;
  }

  communications(candidateId?: string) {
    const list = candidateId
      ? this.data.communications.filter((c) => c.candidateId === candidateId)
      : this.data.communications;
    return [...list].sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  }

  async sendCommunication(
    candidateId: string,
    templateId: string,
    actor: HiringActor,
    overrides?: { subject?: string; body?: string },
    sendEmail?: (input: {
      to: string;
      subject: string;
      body: string;
      candidateId: string;
    }) => Promise<{ ok: boolean; reason?: string }>,
  ): Promise<CommunicationRecord> {
    const c = this.candidate(candidateId);
    if (!c) throw new Error("Candidate not found.");
    const tpl = this.data.templates.find((t) => t.id === templateId);
    if (!tpl) throw new Error("Template not found.");
    const fill = (text: string) =>
      text
        .replaceAll("{{name}}", c.fullName.split(" ")[0] ?? c.fullName)
        .replaceAll("{{role}}", c.appliedJobTitle)
        .replaceAll("{{stage}}", stageLabel(c.currentStage))
        .replaceAll("{{type}}", "interview")
        .replaceAll("{{datetime}}", "the scheduled time")
        .replaceAll("{{expiry}}", "the offer expiry date");
    const subject = fill(overrides?.subject ?? tpl.subject);
    const body = fill(overrides?.body ?? tpl.body);
    let status: CommunicationRecord["status"] = "logged";
    if (sendEmail && c.email) {
      try {
        const result = await sendEmail({
          to: c.email,
          subject,
          body,
          candidateId,
        });
        if (result.ok) status = "sent";
        else if (result.reason === "not_configured") status = "logged";
        else status = "failed";
      } catch {
        status = "failed";
      }
    } else if (sendEmail && !c.email) {
      status = "failed";
    }
    const rec: CommunicationRecord = {
      id: newId("cm"),
      candidateId,
      event: tpl.event,
      subject,
      body,
      channel: "email",
      status,
      actorId: actor.id,
      actorName: actor.name,
      sentAt: nowIso(),
    };
    this.data.communications.unshift(rec);
    this.log({
      candidateId,
      jobId: c.appliedJobId,
      kind: "communication",
      actor,
      note: rec.subject,
    });
    this.persist();
    return rec;
  }

  activity(candidateId?: string) {
    const list = candidateId
      ? this.data.activity.filter((a) => a.candidateId === candidateId)
      : this.data.activity;
    return [...list].sort((a, b) => b.at.localeCompare(a.at));
  }

  private log(input: {
    candidateId: string | null;
    jobId: string | null;
    kind: HiringActivityEvent["kind"];
    actor: HiringActor;
    note: string;
    meta?: HiringActivityEvent["meta"];
  }) {
    this.data.activity.unshift({
      id: newId("act"),
      candidateId: input.candidateId,
      jobId: input.jobId,
      kind: input.kind,
      actorId: input.actor.id,
      actorName: input.actor.name,
      at: nowIso(),
      note: input.note,
      meta: input.meta,
    });
  }

  private feedbackOverdueInterviewIds(): string[] {
    const now = nowIso();
    return this.data.interviews
      .filter((i) => {
        if (i.status !== "completed" && new Date(i.scheduledAt).getTime() > Date.now()) return false;
        if (new Date(i.scheduledAt).getTime() > Date.now()) return false;
        const hours = hoursBetween(i.scheduledAt, now);
        if (hours < FEEDBACK_OVERDUE_HOURS) return false;
        const expected = i.interviewerIds.length || 1;
        const got = this.data.scorecards.filter((s) => s.interviewId === i.id).length;
        return got < expected;
      })
      .map((i) => i.id);
  }

  alerts(now = new Date()): HiringAlert[] {
    const alerts: HiringAlert[] = [];
    const today = todayIso(now);
    for (const c of this.data.candidates) {
      if (c.currentStage === "hired" || c.currentStage === "rejected") continue;
      const days = daysInStageNow(currentStageEnteredAt(c), now);
      if (days >= STUCK_STAGE_DAYS) {
        alerts.push({
          id: `stuck-${c.id}`,
          kind: "stuck_in_stage",
          severity: "urgent",
          title: `${c.fullName} stuck in ${stageLabel(c.currentStage)}`,
          detail: `${days} days in this stage (threshold ${STUCK_STAGE_DAYS}).`,
          candidateId: c.id,
          jobId: c.appliedJobId,
          interviewId: null,
          offerId: null,
        });
      } else if (days >= AGING_STAGE_DAYS) {
        alerts.push({
          id: `aging-${c.id}`,
          kind: "stuck_in_stage",
          severity: "warning",
          title: `${c.fullName} aging in ${stageLabel(c.currentStage)}`,
          detail: `${days} days without a stage move.`,
          candidateId: c.id,
          jobId: c.appliedJobId,
          interviewId: null,
          offerId: null,
        });
      }
    }
    for (const id of this.feedbackOverdueInterviewIds()) {
      const i = this.interview(id);
      if (!i) continue;
      alerts.push({
        id: `fb-${i.id}`,
        kind: "feedback_overdue",
        severity: "warning",
        title: `Scorecard overdue, ${i.candidateName}`,
        detail: `Interview was ${formatDateTime(i.scheduledAt)}.`,
        candidateId: i.candidateId,
        jobId: i.jobId,
        interviewId: i.id,
        offerId: null,
      });
    }
    for (const o of this.data.offers) {
      if (o.status === "pending_approval") {
        alerts.push({
          id: `off-${o.id}`,
          kind: "offer_awaiting_approval",
          severity: "warning",
          title: `Offer awaiting approval, ${o.candidateName}`,
          detail: o.offeredTitle,
          candidateId: o.candidateId,
          jobId: o.jobId,
          interviewId: null,
          offerId: o.id,
        });
      }
    }
    for (const i of this.data.interviews) {
      if (i.status === "no_show") {
        alerts.push({
          id: `ns-${i.id}`,
          kind: "no_show_followup",
          severity: "warning",
          title: `No-show follow-up, ${i.candidateName}`,
          detail: "Reschedule or send a follow-up.",
          candidateId: i.candidateId,
          jobId: i.jobId,
          interviewId: i.id,
          offerId: null,
        });
        continue;
      }
      if (i.status === "cancelled" || i.status === "completed") continue;
      const hours = hoursBetween(now.toISOString(), i.scheduledAt);
      if (hours >= 0 && hours <= INTERVIEW_REMINDER_HOURS) {
        alerts.push({
          id: `up-${i.id}`,
          kind: "upcoming_interview",
          severity: "info",
          title: `Interview soon, ${i.candidateName}`,
          detail: formatDateTime(i.scheduledAt),
          candidateId: i.candidateId,
          jobId: i.jobId,
          interviewId: i.id,
          offerId: null,
        });
      }
    }
    for (const j of this.data.jobs) {
      if (j.status !== "open" || !j.targetHireDate) continue;
      const days = daysBetween(today, j.targetHireDate);
      if (days >= 0 && days <= TARGET_HIRE_WARNING_DAYS) {
        alerts.push({
          id: `req-${j.id}`,
          kind: "requisition_target",
          severity: days <= 7 ? "urgent" : "warning",
          title: `Target hire approaching, ${j.title}`,
          detail: `${days} day${days === 1 ? "" : "s"} to ${j.targetHireDate}.`,
          candidateId: null,
          jobId: j.id,
          interviewId: null,
          offerId: null,
        });
      }
    }
    const order = { urgent: 0, warning: 1, info: 2 };
    return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
  }

  summary(actor?: HiringActor) {
    return buildHiringSummary({
      jobs: this.jobs(actor),
      candidates: this.candidates(EMPTY_FILTERS, actor),
      interviews: this.interviews(actor),
      offers: this.offers(actor),
      scorecards: this.data.scorecards,
    });
  }

  convertible(actor?: HiringActor) {
    return this.candidates(EMPTY_FILTERS, actor).filter(
      (c) =>
        (c.currentStage === "hired" || c.currentStage === "offer_accepted") &&
        !c.convertedEmployeeId,
    );
  }
}

let singleton: HiringStore | null = null;

export function getHiringStore(): HiringStore {
  if (!singleton) singleton = new HiringStore();
  return singleton;
}

export function resetHiringStore() {
  singleton = new HiringStore(emptySnapshot());
  singleton.resetDemo();
  return singleton;
}
