"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { JobStatusBadge, PriorityBadge } from "@/components/hiring/hiring-status-badge";
import {
  employmentTypeLabel,
  formatDate,
  formatMoney,
  jobStatusLabel,
  SELECT_CLASS,
} from "@/lib/hiring/format";
import { FitScoreBadge } from "@/components/hiring/fit-score-badge";
import type { FitScoreResult } from "@/lib/hiring/fit-score";
import type { JobOpening, JobStatus } from "@/lib/hiring/types";
import { JOB_STATUSES } from "@/lib/hiring/types";
import { UserAvatar } from "@/components/user-avatar";
import type { Candidate } from "@/lib/hiring/types";

export function JobDetailDrawer({
  job,
  candidates,
  fits,
  open,
  onOpenChange,
  canManage,
  onEdit,
  onStatus,
  onOpenCandidate,
  onRemove,
}: {
  job: JobOpening | null;
  candidates: Candidate[];
  fits: Record<string, FitScoreResult>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  onEdit: () => void;
  onStatus: (status: JobStatus) => void;
  onOpenCandidate: (id: string) => void;
  onRemove: () => void;
}) {
  const ranked = [...candidates].sort(
    (a, b) => (fits[b.id]?.score ?? -1) - (fits[a.id]?.score ?? -1),
  );
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-xl">
        {job ? (
          <>
            <SheetHeader>
              <SheetTitle>{job.title}</SheetTitle>
              <SheetDescription>
                {job.department} · {job.location} · {employmentTypeLabel(job.employmentType)}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <JobStatusBadge status={job.status} />
                <PriorityBadge priority={job.priority} />
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Hiring manager</dt>
                  <dd>{job.hiringManagerName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Recruiter</dt>
                  <dd>{job.recruiterOwnerName}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Openings</dt>
                  <dd>
                    {job.filledCount}/{job.openingsCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Salary range</dt>
                  <dd>
                    {formatMoney(job.salaryRangeMin, job.currency)}–{formatMoney(job.salaryRangeMax, job.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Opened</dt>
                  <dd>{formatDate(job.openedAt)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Target hire</dt>
                  <dd>{formatDate(job.targetHireDate)}</dd>
                </div>
              </dl>
              {job.description ? <p className="text-sm leading-relaxed">{job.description}</p> : null}
              {job.requirements ? (
                <section>
                  <h3 className="text-sm font-semibold">Requirements</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{job.requirements}</p>
                </section>
              ) : null}
              {job.responsibilities ? (
                <section>
                  <h3 className="text-sm font-semibold">Responsibilities</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{job.responsibilities}</p>
                </section>
              ) : null}
              {job.screeningQuestions.length > 0 ? (
                <section>
                  <h3 className="text-sm font-semibold">Screening questions</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                    {job.screeningQuestions.map((q) => (
                      <li key={q.id}>
                        {q.prompt}
                        {q.knockout ? " (knockout)" : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {canManage ? (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={onEdit}>
                    Edit opening
                  </Button>
                  <select
                    className={`${SELECT_CLASS} w-auto`}
                    value={job.status}
                    onChange={(e) => onStatus(e.target.value as JobStatus)}
                  >
                    {JOB_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {jobStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <Button size="sm" variant="outline" onClick={onRemove}>
                    Remove
                  </Button>
                </div>
              ) : null}

              <section>
                <h3 className="mb-2 text-sm font-semibold">Candidates on this role</h3>
                {ranked.length === 0 ? (
                  <p className="text-sm text-muted-foreground">None yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {ranked.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left hover:bg-accent/40"
                          onClick={() => onOpenCandidate(c.id)}
                        >
                          <UserAvatar name={c.fullName} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">{c.fullName}</span>
                            <span className="text-xs text-muted-foreground">{c.currentStage.replaceAll("_", " ")}</span>
                          </span>
                          <FitScoreBadge
                            compact
                            result={
                              fits[c.id] ?? {
                                score: null,
                                band: null,
                                matchedSkills: [],
                                missingSkills: [],
                                knockout: false,
                                usedInterview: false,
                              }
                            }
                          />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </SheetBody>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
