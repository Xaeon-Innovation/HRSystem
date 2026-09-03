"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { FitScoreBadge } from "@/components/hiring/fit-score-badge";
import { HiringEmptyState } from "@/components/hiring/hiring-states";
import { formatDateTime, SELECT_CLASS } from "@/lib/hiring/format";
import { bandFor } from "@/lib/hiring/fit-score";
import type { BestFitDraft, Candidate, JobOpening } from "@/lib/hiring/types";

export function BestFitPanel({
  drafts,
  candidates,
  openJobs,
  canManage,
  onOpenCandidate,
  onAttach,
  onRemove,
}: {
  drafts: BestFitDraft[];
  candidates: Candidate[];
  openJobs: JobOpening[];
  canManage: boolean;
  onOpenCandidate: (id: string) => void;
  onAttach: (draftId: string, jobId: string) => void;
  onRemove: (draftId: string) => void;
}) {
  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const [jobByDraft, setJobByDraft] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<BestFitDraft | null>(null);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold">Best-fit bench</h2>
        <p className="text-xs text-muted-foreground">
          Strong contacts kept for later openings. Removing someone from the bench does not delete them.
        </p>
      </div>
      {drafts.length === 0 ? (
        <HiringEmptyState
          title="No best-fit drafts yet"
          description="Save a candidate as best fit from their profile or the pipeline when you want to keep the contact warm."
        />
      ) : (
        <ul className="space-y-2">
          {drafts.map((d) => {
            const c = byId.get(d.candidateId);
            const jobId = jobByDraft[d.id] ?? openJobs[0]?.id ?? "";
            const fit = d.fitScore == null ? null : { score: d.fitScore, band: bandFor(d.fitScore), matchedSkills: [], missingSkills: [], knockout: false, usedInterview: false };
            return (
              <li
                key={d.id}
                className="flex flex-col gap-3 rounded-xl border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <UserAvatar name={c?.fullName ?? d.jobTitle} size="md" />
                  <div className="min-w-0">
                    <p className="font-semibold">{c?.fullName ?? "Candidate removed"}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.jobTitle} · {d.department}
                      {d.jobId ? "" : " · opening gone"}
                    </p>
                    {c ? (
                      <p className="mt-1 text-xs">
                        {c.email}
                        {c.phone ? ` · ${c.phone}` : ""}
                      </p>
                    ) : null}
                    {d.note ? <p className="mt-1 text-sm">{d.note}</p> : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Saved by {d.savedByName} · {formatDateTime(d.savedAt)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {fit ? <FitScoreBadge result={fit} /> : <FitScoreBadge result={{ score: null, band: null, matchedSkills: [], missingSkills: [], knockout: false, usedInterview: false }} />}
                  {c ? (
                    <Button size="sm" variant="outline" onClick={() => onOpenCandidate(c.id)}>
                      Profile
                    </Button>
                  ) : null}
                  {canManage && c ? (
                    <>
                      <select
                        className={`${SELECT_CLASS} w-auto`}
                        value={jobId}
                        onChange={(e) => setJobByDraft((prev) => ({ ...prev, [d.id]: e.target.value }))}
                      >
                        {openJobs.length === 0 ? <option value="">No open jobs</option> : null}
                        {openJobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.title}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        disabled={!jobId}
                        onClick={() => {
                          if (jobId) onAttach(d.id, jobId);
                        }}
                      >
                        Attach to opening
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setPending(d)}>
                        Remove from bench
                      </Button>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={Boolean(pending)}
        title={`Remove “${byId.get(pending?.candidateId ?? "")?.fullName ?? "this draft"}” from the bench?`}
        description="They stay in hiring. This only drops the best-fit reminder."
        confirmLabel="Remove from bench"
        variant="destructive"
        onConfirm={() => {
          if (pending) onRemove(pending.id);
          setPending(null);
        }}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      />
    </div>
  );
}
