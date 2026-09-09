"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getUser, type AuthUser } from "@/lib/api";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { BestFitPanel } from "@/components/hiring/best-fit-panel";
import { CandidateDatabaseTable } from "@/components/hiring/candidate-database-table";
import { CandidateForm } from "@/components/hiring/candidate-form";
import { CandidatePipelineBoard } from "@/components/hiring/candidate-pipeline-board";
import { CandidateProfileDrawer } from "@/components/hiring/candidate-profile-drawer";
import { ConvertToEmployeeModal, createEmployeeFromDraft } from "@/components/hiring/convert-to-employee-modal";
import { HiringHeader } from "@/components/hiring/hiring-header";
import { HiringHomePanel } from "@/components/hiring/hiring-home-panel";
import { HiringOverviewCards } from "@/components/hiring/hiring-overview-cards";
import { HiringReportsPanel } from "@/components/hiring/hiring-reports-panel";
import {
  HiringAccessDenied,
  HiringEmptyState,
  HiringErrorState,
  HiringLoadingSkeleton,
} from "@/components/hiring/hiring-states";
import { InterviewsCalendar } from "@/components/hiring/interviews-calendar";
import { InterviewScheduleForm } from "@/components/hiring/interview-schedule-form";
import { InterviewScorecardForm } from "@/components/hiring/interview-scorecard-form";
import { JobDetailDrawer } from "@/components/hiring/job-detail-drawer";
import { JobOpeningForm } from "@/components/hiring/job-opening-form";
import { JobOpeningsTable } from "@/components/hiring/job-openings-table";
import { OfferDetailDrawer } from "@/components/hiring/offer-detail-drawer";
import { OfferForm } from "@/components/hiring/offer-form";
import { OffersTable } from "@/components/hiring/offers-table";
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { daysInStageNow, sameDay, SELECT_CLASS, sourceLabel, stageLabel, todayIso } from "@/lib/hiring/format";
import { currentStageEnteredAt } from "@/lib/hiring/reports";
import { STUCK_STAGE_DAYS, canManageCandidates, canManageJobs, canManageOffers, canMoveCandidates, canScheduleInterviews, canConvertToEmployee } from "@/lib/hiring/workflow";
import {
  CANDIDATE_SOURCES,
  CANDIDATE_STAGES,
  type CandidateFilters,
  type CandidateSource,
  type CandidateStage,
  type EmployeeConvertDraft,
  type HiringActor,
  type JobStatus,
} from "@/lib/hiring/types";
import { getHiringStore } from "@/lib/hiring";
import { StageBadge } from "@/components/hiring/hiring-status-badge";

type EmployeeOption = {
  id: string;
  name: string;
  email?: string | null;
  jobTitle?: string | null;
  role?: string;
  branchId?: string | null;
};

type BranchOption = { id: string; name: string };

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

function actorFrom(user: AuthUser | null): HiringActor {
  return {
    id: user?.id ?? "anonymous",
    name: user?.name ?? "You",
    role: user?.role ?? "employee",
    employeeId: user?.employeeId,
    systemModuleRoles: user?.systemModuleRoles ?? [],
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export function HiringDashboard() {
  const store = getHiringStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState("dashboard");
  const [filters, setFilters] = useState<CandidateFilters>(EMPTY_FILTERS);
  const [jobFormOpen, setJobFormOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [candidateFormOpen, setCandidateFormOpen] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [interviewFormOpen, setInterviewFormOpen] = useState(false);
  const [interviewCandidateId, setInterviewCandidateId] = useState<string | null>(null);
  const [scoreInterviewId, setScoreInterviewId] = useState<string | null>(null);
  const [offerFormOpen, setOfferFormOpen] = useState(false);
  const [offerCandidateId, setOfferCandidateId] = useState<string | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [convertId, setConvertId] = useState<string | null>(null);
  const [convertBusy, setConvertBusy] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleAt, setRescheduleAt] = useState("");
  const [createdEmployee, setCreatedEmployee] = useState<string | null>(null);
  const [pendingRemoveJobId, setPendingRemoveJobId] = useState<string | null>(null);
  const [pendingRemoveCandidateId, setPendingRemoveCandidateId] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const refresh = () => setTick((n) => n + 1);
  const actor = actorFrom(user);
  const isAdmin = canManageJobs(actor);
  const allowed = store.canAccess(actor);

  useEffect(() => {
    setUser(getUser());
    setLoading(true);
    setError(null);
    const current = getUser();
    const admin = canManageJobs(actorFrom(current));
    Promise.all([
      admin
        ? api<{ employees: EmployeeOption[] }>("/v1/employees").catch(() => ({ employees: [] }))
        : Promise.resolve({ employees: [] as EmployeeOption[] }),
      admin
        ? api<{ branches: BranchOption[] }>("/v1/branches").catch(() => ({ branches: [] }))
        : Promise.resolve({ branches: [] as BranchOption[] }),
    ])
      .then(([empRes, branchRes]) => {
        store.hydrateDirectory({
          employees: empRes.employees,
          branches: branchRes.branches,
          current: actorFrom(current),
        });
        refresh();
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load hiring"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const jobs = useMemo(
    () => store.jobs(actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id, actor.role],
  );
  const candidates = useMemo(
    () => store.candidates(filters, actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, filters, actor.id, actor.role],
  );
  const allVisible = useMemo(
    () => store.candidates(EMPTY_FILTERS, actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id, actor.role],
  );
  const interviews = useMemo(
    () => store.interviews(actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id, actor.role],
  );
  const offers = useMemo(
    () => store.offers(actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id, actor.role],
  );
  const summary = useMemo(
    () => store.summary(actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id, actor.role],
  );
  const alerts = useMemo(
    () => store.alerts(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const duplicates = useMemo(() => store.duplicateIds(), [tick]);
  const convertible = useMemo(
    () => store.convertible(actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id],
  );
  const fits = useMemo(() => {
    const map: Record<string, ReturnType<typeof store.fitFor>> = {};
    for (const c of allVisible) map[c.id] = store.fitFor(c);
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, allVisible]);
  const bestFitDrafts = useMemo(
    () => store.bestFitDrafts(actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id, actor.role],
  );

  const selectedCandidate = selectedCandidateId ? store.candidate(selectedCandidateId) : null;
  const selectedJob = selectedJobId ? store.job(selectedJobId) : null;
  const selectedOffer = selectedOfferId ? store.offer(selectedOfferId) : null;
  const scoreInterview = scoreInterviewId ? store.interview(scoreInterviewId) : null;
  const convertCandidate = convertId ? store.candidate(convertId) : null;
  const convertDraft = convertId ? store.convertDraft(convertId) : null;
  const departments = [...new Set(jobs.map((j) => j.department))].sort();
  const todayInterviews = interviews.filter((i) => sameDay(i.scheduledAt, todayIso()) && i.status !== "cancelled");
  const pendingOffers = offers.filter((o) => o.status === "sent" || o.status === "pending_approval");
  const stuck = allVisible.filter(
    (c) =>
      c.currentStage !== "hired" &&
      c.currentStage !== "rejected" &&
      daysInStageNow(currentStageEnteredAt(c)) >= STUCK_STAGE_DAYS,
  );

  function run(action: () => void) {
    try {
      action();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  async function convert(draft: EmployeeConvertDraft) {
    if (!convertId) return;
    setConvertBusy(true);
    setConvertError(null);
    try {
      const payload = {
        ...draft,
        branchId: isUuid(draft.branchId) ? draft.branchId : "",
      };
      const res = await createEmployeeFromDraft(payload);
      store.markConverted(convertId, res.employee.id, actor);
      setCreatedEmployee(res.employee.name);
      setConvertId(null);
      refresh();
      setTab("hired");
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : "Could not create employee");
    } finally {
      setConvertBusy(false);
    }
  }

  if (loading) return <HiringLoadingSkeleton />;
  if (!allowed) return <HiringAccessDenied />;
  if (error && jobs.length === 0 && allVisible.length === 0) {
    return (
      <HiringErrorState
        message={error}
        onRetry={() => {
          setError(null);
          window.location.reload();
        }}
      />
    );
  }

  const canMove = canMoveCandidates(actor, store.isHiringManager(actor));

  return (
    <div className="space-y-5">
      <HiringHeader
        canManage={isAdmin}
        onNewJob={() => {
          setEditingJobId(null);
          setJobFormOpen(true);
        }}
        onAddCandidate={() => setCandidateFormOpen(true)}
      />

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">{error}</p>
      ) : null}
      {createdEmployee ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
          {createdEmployee} is on the employee roster.{" "}
          <a href="/app/employees" className="font-medium underline">
            Open employees
          </a>
        </p>
      ) : null}
      {alerts.filter((a) => a.severity === "urgent").length > 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          {alerts.filter((a) => a.severity === "urgent").length} urgent hiring alert
          {alerts.filter((a) => a.severity === "urgent").length === 1 ? "" : "s"} — stuck stages or hire dates.
        </p>
      ) : null}

      <HiringOverviewCards summary={summary} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="dashboard" className="flex-none px-3">
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="jobs" className="flex-none px-3">
            Job openings
          </TabsTrigger>
          <TabsTrigger value="pipeline" className="flex-none px-3">
            Pipeline
          </TabsTrigger>
          <TabsTrigger value="candidates" className="flex-none px-3">
            Candidates
          </TabsTrigger>
          <TabsTrigger value="interviews" className="flex-none px-3">
            Interviews
            {summary.interviewsToday > 0 ? (
              <span className="ml-1.5 rounded-full bg-sky-100 px-1.5 text-[10px] font-semibold text-sky-900">
                {summary.interviewsToday}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="offers" className="flex-none px-3">
            Offers
            {summary.offersPending > 0 ? (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 text-[10px] font-semibold text-amber-900">
                {summary.offersPending}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="hired" className="flex-none px-3">
            Hired
            {convertible.length > 0 ? (
              <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-900">
                {convertible.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="best-fit" className="flex-none px-3">
            Best fit
            {bestFitDrafts.length > 0 ? (
              <span className="ml-1.5 rounded-full bg-violet-100 px-1.5 text-[10px] font-semibold text-violet-900">
                {bestFitDrafts.length}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-none px-3">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <HiringHomePanel
            summary={summary}
            alerts={alerts}
            interviewsToday={todayInterviews}
            pendingOffers={pendingOffers}
            stuck={stuck}
            onOpenCandidate={setSelectedCandidateId}
            onOpenInterview={(id) => {
              const i = store.interview(id);
              if (i) setSelectedCandidateId(i.candidateId);
            }}
            onOpenOffer={setSelectedOfferId}
            onGoPipeline={() => setTab("pipeline")}
            onGoInterviews={() => setTab("interviews")}
            onGoOffers={() => setTab("offers")}
          />
        </TabsContent>

        <TabsContent value="jobs" className="mt-4">
          <JobOpeningsTable
            jobs={jobs}
            departments={departments}
            canManage={isAdmin}
            onOpen={setSelectedJobId}
            onNew={() => {
              setEditingJobId(null);
              setJobFormOpen(true);
            }}
            onRemove={setPendingRemoveJobId}
          />
        </TabsContent>

        <TabsContent value="pipeline" className="mt-4 space-y-3">
          <PipelineFilters
            filters={filters}
            jobs={jobs}
            departments={departments}
            recruiters={store.team()}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
          />
          <CandidatePipelineBoard
            candidates={candidates}
            fits={fits}
            canMove={canMove}
            canManage={canManageCandidates(actor)}
            onOpen={setSelectedCandidateId}
            onMove={(id, stage) => run(() => store.moveCandidate(id, stage, actor))}
            onSaveBestFit={(id) => run(() => store.saveBestFit(id, actor))}
          />
        </TabsContent>

        <TabsContent value="candidates" className="mt-4">
          <CandidateDatabaseTable
            candidates={candidates}
            jobs={jobs}
            fits={fits}
            duplicateIds={duplicates}
            filters={filters}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onOpen={setSelectedCandidateId}
            onAdd={() => setCandidateFormOpen(true)}
            onRemove={setPendingRemoveCandidateId}
            canManage={canManageCandidates(actor)}
          />
        </TabsContent>

        <TabsContent value="interviews" className="mt-4">
          <InterviewsCalendar
            interviews={interviews}
            canSchedule={canScheduleInterviews(actor) || store.isHiringManager(actor)}
            onSchedule={() => {
              setInterviewCandidateId(null);
              setInterviewFormOpen(true);
            }}
            onOpenCandidate={setSelectedCandidateId}
            onScore={setScoreInterviewId}
            onReschedule={(id) => {
              const i = store.interview(id);
              setRescheduleId(id);
              if (i?.scheduledAt) {
                const d = new Date(i.scheduledAt);
                const pad = (n: number) => String(n).padStart(2, "0");
                setRescheduleAt(
                  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
                );
              } else {
                setRescheduleAt("");
              }
            }}
            onNoShow={(id) => run(() => store.markNoShow(id, actor))}
            onConfirm={(id) =>
              run(() => store.setInterviewStatus(id, { confirmationStatus: "confirmed", status: "confirmed" }, actor))
            }
          />
        </TabsContent>

        <TabsContent value="offers" className="mt-4">
          <OffersTable
            offers={offers}
            canManage={canManageOffers(actor)}
            onOpen={setSelectedOfferId}
            onNew={() => {
              setOfferCandidateId(null);
              setOfferFormOpen(true);
            }}
            onApprove={(id) => run(() => store.approveOffer(id, actor))}
          />
        </TabsContent>

        <TabsContent value="hired" className="mt-4 space-y-4">
          <div>
            <h2 className="text-sm font-semibold">Ready to convert</h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Offer accepted or marked hired, with no employee record yet.
            </p>
            {convertible.length === 0 ? (
              <HiringEmptyState
                title="No hires waiting on conversion"
                description="When an offer is accepted or a candidate is marked hired, convert them here so they appear on the employee roster."
              />
            ) : (
              <div className="space-y-2">
                {convertible.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar name={c.fullName} size="md" />
                      <div>
                        <p className="font-semibold">{c.fullName}</p>
                        <p className="text-xs text-muted-foreground">{c.appliedJobTitle}</p>
                      </div>
                      <StageBadge stage={c.currentStage} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedCandidateId(c.id)}>
                        Profile
                      </Button>
                      {canConvertToEmployee(actor) ? (
                        <Button size="sm" onClick={() => setConvertId(c.id)}>
                          Convert to employee
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold">Already on the roster</h2>
            <p className="mb-3 text-xs text-muted-foreground">Hires linked to an employee record.</p>
            {allVisible.filter((c) => c.convertedEmployeeId).length === 0 ? (
              <p className="text-sm text-muted-foreground">None converted yet.</p>
            ) : (
              <ul className="space-y-2">
                {allVisible
                  .filter((c) => c.convertedEmployeeId)
                  .map((c) => (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <UserAvatar name={c.fullName} size="sm" />
                        <div>
                          <p className="font-medium">{c.fullName}</p>
                          <p className="text-xs text-muted-foreground">{c.appliedJobTitle}</p>
                        </div>
                      </div>
                      <a href="/app/employees" className="text-sm text-primary hover:underline">
                        Open employees
                      </a>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="best-fit" className="mt-4">
          <BestFitPanel
            drafts={bestFitDrafts}
            candidates={allVisible}
            openJobs={jobs.filter((j) => j.status === "open")}
            canManage={canManageCandidates(actor)}
            onOpenCandidate={setSelectedCandidateId}
            onAttach={(draftId, jobId) =>
              run(() => {
                store.attachBestFit(draftId, jobId, actor);
                setTab("pipeline");
              })
            }
            onRemove={(id) => run(() => store.removeBestFit(id, actor))}
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <HiringReportsPanel summary={summary} />
        </TabsContent>
      </Tabs>

      <JobOpeningForm
        key={`${jobFormOpen}-${editingJobId ?? "new"}`}
        open={jobFormOpen}
        onOpenChange={setJobFormOpen}
        store={store}
        actor={actor}
        editing={editingJobId ? store.job(editingJobId) : null}
        onSubmitted={refresh}
      />
      <CandidateForm
        open={candidateFormOpen}
        onOpenChange={setCandidateFormOpen}
        store={store}
        actor={actor}
        onSubmitted={(id) => {
          refresh();
          setSelectedCandidateId(id);
        }}
      />
      <InterviewScheduleForm
        key={`${interviewFormOpen}-${interviewCandidateId ?? "any"}`}
        open={interviewFormOpen}
        onOpenChange={setInterviewFormOpen}
        store={store}
        actor={actor}
        presetCandidateId={interviewCandidateId}
        onSubmitted={refresh}
      />
      <InterviewScorecardForm
        open={Boolean(scoreInterview)}
        onOpenChange={(open) => {
          if (!open) setScoreInterviewId(null);
        }}
        store={store}
        actor={actor}
        interview={scoreInterview ?? null}
        onSubmitted={refresh}
      />
      <OfferForm
        key={`${offerFormOpen}-${offerCandidateId ?? "any"}`}
        open={offerFormOpen}
        onOpenChange={setOfferFormOpen}
        store={store}
        actor={actor}
        presetCandidateId={offerCandidateId}
        onSubmitted={(id) => {
          refresh();
          setSelectedOfferId(id);
        }}
      />
      <CandidateProfileDrawer
        candidate={selectedCandidate ?? null}
        store={store}
        actor={actor}
        open={Boolean(selectedCandidate)}
        onOpenChange={(open) => {
          if (!open) setSelectedCandidateId(null);
          else refresh();
        }}
        canManage={canManageCandidates(actor)}
        canMove={canMove}
        canConvert={canConvertToEmployee(actor)}
        duplicate={selectedCandidate ? duplicates.has(selectedCandidate.id) : false}
        onMove={(id, stage) => run(() => store.moveCandidate(id, stage, actor))}
        onSchedule={(id) => {
          setInterviewCandidateId(id);
          setInterviewFormOpen(true);
        }}
        onScore={setScoreInterviewId}
        onOffer={(id) => {
          setOfferCandidateId(id);
          setOfferFormOpen(true);
        }}
        onConvert={setConvertId}
        onChanged={refresh}
        onRemoved={() => {
          setSelectedCandidateId(null);
          refresh();
        }}
      />
      <JobDetailDrawer
        job={selectedJob ?? null}
        candidates={selectedJob ? allVisible.filter((c) => c.appliedJobId === selectedJob.id) : []}
        fits={fits}
        open={Boolean(selectedJob)}
        onOpenChange={(open) => {
          if (!open) setSelectedJobId(null);
        }}
        canManage={isAdmin}
        onEdit={() => {
          if (!selectedJob) return;
          setEditingJobId(selectedJob.id);
          setSelectedJobId(null);
          setJobFormOpen(true);
        }}
        onStatus={(status: JobStatus) => {
          if (!selectedJob) return;
          run(() => store.setJobStatus(selectedJob.id, status, actor));
        }}
        onRemove={() => {
          if (selectedJob) setPendingRemoveJobId(selectedJob.id);
        }}
        onOpenCandidate={(id) => {
          setSelectedJobId(null);
          setSelectedCandidateId(id);
        }}
      />
      <OfferDetailDrawer
        offer={selectedOffer ?? null}
        open={Boolean(selectedOffer)}
        onOpenChange={(open) => {
          if (!open) setSelectedOfferId(null);
        }}
        canManage={canManageOffers(actor)}
        onSend={(id) => run(() => store.setOfferStatus(id, "sent", actor))}
        onApprove={(id) => run(() => store.approveOffer(id, actor))}
        onAccept={(id) => run(() => store.setOfferStatus(id, "accepted", actor))}
        onReject={(id, notes) => run(() => store.setOfferStatus(id, "rejected", actor, notes))}
        onOpenCandidate={(id) => {
          setSelectedOfferId(null);
          setSelectedCandidateId(id);
        }}
      />
      <ConvertToEmployeeModal
        candidate={convertCandidate ?? null}
        draft={convertDraft}
        branches={store.branches()}
        open={Boolean(convertId)}
        busy={convertBusy}
        error={convertError}
        onOpenChange={(open) => {
          if (!open && !convertBusy) {
            setConvertId(null);
            setConvertError(null);
          }
        }}
        onConvert={convert}
      />
      <DialogPrimitive.Root
        open={Boolean(rescheduleId)}
        onOpenChange={(open) => {
          if (!open) setRescheduleId(null);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-[2px]" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[61] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-5 shadow-2xl">
            <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
              Reschedule interview
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
              Pick a new date and time. Candidate confirmation resets to pending.
            </DialogPrimitive.Description>
            <Input
              type="datetime-local"
              className="mt-3"
              value={rescheduleAt}
              onChange={(e) => setRescheduleAt(e.target.value)}
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRescheduleId(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!rescheduleAt}
                onClick={() => {
                  if (!rescheduleId || !rescheduleAt) return;
                  run(() =>
                    store.rescheduleInterview(rescheduleId, new Date(rescheduleAt).toISOString(), actor),
                  );
                  setRescheduleId(null);
                }}
              >
                Reschedule
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
      <ConfirmDialog
        open={Boolean(pendingRemoveJobId)}
        title={`Remove “${pendingRemoveJobId ? store.job(pendingRemoveJobId)?.title ?? "this opening" : "this opening"}”?`}
        description="The requisition is deleted. People stay in hiring and move to the talent pool. Save strong contacts as best fit if you will hire them later."
        confirmLabel="Remove opening"
        variant="destructive"
        busy={removeBusy}
        onConfirm={() => {
          if (!pendingRemoveJobId) return;
          setRemoveBusy(true);
          try {
            store.removeJob(pendingRemoveJobId, actor);
            setPendingRemoveJobId(null);
            setSelectedJobId(null);
            refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not remove opening");
          } finally {
            setRemoveBusy(false);
          }
        }}
        onOpenChange={(open) => {
          if (!open && !removeBusy) setPendingRemoveJobId(null);
        }}
      />
      <ConfirmDialog
        open={Boolean(pendingRemoveCandidateId)}
        title={`Remove “${pendingRemoveCandidateId ? store.candidate(pendingRemoveCandidateId)?.fullName ?? "this candidate" : "this candidate"}”?`}
        description="This deletes the person and their interviews, offers, notes, and best-fit drafts. Save as best fit first if you might need the contact."
        confirmLabel="Remove"
        variant="destructive"
        busy={removeBusy}
        onConfirm={() => {
          if (!pendingRemoveCandidateId) return;
          setRemoveBusy(true);
          try {
            store.removeCandidate(pendingRemoveCandidateId, actor);
            setPendingRemoveCandidateId(null);
            if (selectedCandidateId === pendingRemoveCandidateId) setSelectedCandidateId(null);
            refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not remove candidate");
          } finally {
            setRemoveBusy(false);
          }
        }}
        onOpenChange={(open) => {
          if (!open && !removeBusy) setPendingRemoveCandidateId(null);
        }}
      />
    </div>
  );
}

function PipelineFilters({
  filters,
  jobs,
  departments,
  recruiters,
  onChange,
}: {
  filters: CandidateFilters;
  jobs: { id: string; title: string }[];
  departments: string[];
  recruiters: { id: string; name: string }[];
  onChange: (patch: Partial<CandidateFilters>) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <Input
        placeholder="Filter pipeline…"
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        className="max-w-xs"
      />
      <select
        className={`${SELECT_CLASS} w-auto`}
        value={filters.jobId}
        onChange={(e) => onChange({ jobId: e.target.value })}
      >
        <option value="">All roles</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title}
          </option>
        ))}
      </select>
      <select
        className={`${SELECT_CLASS} w-auto`}
        value={filters.department}
        onChange={(e) => onChange({ department: e.target.value })}
      >
        <option value="">All departments</option>
        {departments.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <select
        className={`${SELECT_CLASS} w-auto`}
        value={filters.source}
        onChange={(e) => onChange({ source: e.target.value as CandidateSource | "" })}
      >
        <option value="">All sources</option>
        {CANDIDATE_SOURCES.map((s) => (
          <option key={s} value={s}>
            {sourceLabel(s)}
          </option>
        ))}
      </select>
      <select
        className={`${SELECT_CLASS} w-auto`}
        value={filters.recruiterId}
        onChange={(e) => onChange({ recruiterId: e.target.value })}
      >
        <option value="">All recruiters</option>
        {recruiters.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
      <select
        className={`${SELECT_CLASS} w-auto`}
        value={filters.stage}
        onChange={(e) => onChange({ stage: e.target.value as CandidateStage | "" })}
      >
        <option value="">All stages</option>
        {CANDIDATE_STAGES.map((s) => (
          <option key={s} value={s}>
            {stageLabel(s)}
          </option>
        ))}
      </select>
    </div>
  );
}
