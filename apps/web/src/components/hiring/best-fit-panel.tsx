"use client";

import { useMemo, useState } from "react";
import { Chip, HatchBar } from "@/components/elevora";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { HiringEmptyState } from "@/components/hiring/hiring-states";
import { SELECT_CLASS } from "@/lib/hiring/format";
import type { BestFitDraft, Candidate, JobOpening } from "@/lib/hiring/types";
import { t } from "@/i18n";

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
  const [jobFilter, setJobFilter] = useState(openJobs[0]?.id ?? "");
  const [jobByDraft, setJobByDraft] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<BestFitDraft | null>(null);

  const ranked = useMemo(() => {
    return drafts
      .slice()
      .sort((a, b) => (b.fitScore ?? 0) - (a.fitScore ?? 0));
  }, [drafts]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          className={`${SELECT_CLASS} w-full sm:w-auto`}
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
        >
          {openJobs.length === 0 ? <option value="">{t("No open jobs")}</option> : null}
          {openJobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <span className="text-xs text-ink-muted">
          {t("Ranked drafts against open jobs")}
        </span>
      </div>

      {ranked.length === 0 ? (
        <HiringEmptyState
          title={t("No best-fit drafts yet")}
          description={t(
            "Save a candidate as best fit from their profile or the pipeline when you want to keep the contact warm.",
          )}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
          {ranked.map((d, i) => {
            const c = byId.get(d.candidateId);
            const score = d.fitScore ?? 0;
            const jobId = jobByDraft[d.id] ?? (jobFilter || openJobs[0]?.id || "");
            const skills = (c?.skills ?? c?.tags ?? []).slice(0, 3);
            return (
              <div
                key={d.id}
                className="rounded-sm border border-line bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <UserAvatar name={c?.fullName ?? d.jobTitle} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">
                        {c?.fullName ?? t("Candidate removed")}
                      </p>
                      <p className="text-xs text-ink-muted">
                        #{i + 1} {t("match")}
                      </p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold tabular-nums text-ink">{score}</span>
                </div>
                <HatchBar className="mt-2" size="sm" percent={score} tone="accent" />
                <div className="mt-2 flex flex-wrap gap-1">
                  {skills.length > 0
                    ? skills.map((s) => (
                        <Chip key={s} tone="neutral">
                          {s}
                        </Chip>
                      ))
                    : (
                      <Chip tone="neutral">{d.department || d.jobTitle}</Chip>
                    )}
                </div>
                <div className="mt-3 flex flex-col gap-2">
                  {c ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => onOpenCandidate(c.id)}
                    >
                      {t("Profile")}
                    </Button>
                  ) : null}
                  {canManage && c ? (
                    <>
                      <select
                        className={`${SELECT_CLASS} w-full`}
                        value={jobId}
                        onChange={(e) =>
                          setJobByDraft((prev) => ({ ...prev, [d.id]: e.target.value }))
                        }
                      >
                        {openJobs.length === 0 ? (
                          <option value="">{t("No open jobs")}</option>
                        ) : null}
                        {openJobs.map((j) => (
                          <option key={j.id} value={j.id}>
                            {j.title}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        className="w-full"
                        disabled={!jobId}
                        onClick={() => {
                          if (jobId) onAttach(d.id, jobId);
                        }}
                      >
                        {t("Attach to opening")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full"
                        onClick={() => setPending(d)}
                      >
                        {t("Remove from bench")}
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
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
