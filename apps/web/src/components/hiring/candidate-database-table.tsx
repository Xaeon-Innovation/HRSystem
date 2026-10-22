"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/user-avatar";
import { HiringEmptyState } from "@/components/hiring/hiring-states";
import {
  CandidateStatusBadge,
  SourceChip,
} from "@/components/hiring/hiring-status-badge";
import { SELECT_CLASS, sourceLabel, stageLabel } from "@/lib/hiring/format";
import type { FitScoreResult } from "@/lib/hiring/fit-score";
import { FitScoreBadge } from "@/components/hiring/fit-score-badge";
import {
  CANDIDATE_SOURCES,
  CANDIDATE_STAGES,
  CANDIDATE_STATUSES,
  type Candidate,
  type CandidateFilters,
  type CandidateSource,
  type CandidateStage,
  type CandidateStatus,
  type JobOpening,
} from "@/lib/hiring/types";
import { t } from "@/i18n";

export function CandidateDatabaseTable({
  candidates,
  jobs,
  fits,
  duplicateIds,
  filters,
  onChange,
  onOpen,
  onAdd,
  onRemove,
  canManage,
}: {
  candidates: Candidate[];
  jobs: JobOpening[];
  fits: Record<string, FitScoreResult>;
  duplicateIds: Set<string>;
  filters: CandidateFilters;
  onChange: (patch: Partial<CandidateFilters>) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  canManage: boolean;
}) {
  const [sort, setSort] = useState<"updated" | "name" | "stage" | "rating" | "fit">("updated");
  const tags = useMemo(() => {
    const set = new Set<string>();
    for (const c of candidates) c.tags.forEach((t) => set.add(t));
    return [...set].sort();
  }, [candidates]);

  const rows = useMemo(() => {
    const list = [...candidates];
    list.sort((a, b) => {
      if (sort === "name") return a.fullName.localeCompare(b.fullName);
      if (sort === "stage") return a.currentStage.localeCompare(b.currentStage);
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "fit") return (fits[b.id]?.score ?? -1) - (fits[a.id]?.score ?? -1);
      return b.updatedAt.localeCompare(a.updatedAt);
    });
    return list;
  }, [candidates, sort, fits]);

  const views: Array<{ id: CandidateFilters["view"]; label: string }> = [
    { id: "all", label: t("All") },
    { id: "mine", label: t("My pipeline") },
    { id: "needs_feedback", label: t("Needs feedback") },
    { id: "offers", label: t("Offers") },
    { id: "talent_pool", label: t("Talent pool") },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange({ view: v.id })}
            className={
              filters.view === v.id
                ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-full bg-surface-2 px-3 py-1 text-xs font-medium hover:bg-surface-2/80"
            }
          >
            {v.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder={t("Search name, email, skills, tags…")}
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          className="max-w-sm"
        />
        <select
          className={`${SELECT_CLASS} w-auto`}
          value={filters.jobId}
          onChange={(e) => onChange({ jobId: e.target.value })}
        >
          <option value="">{t("All roles")}</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
        <select
          className={`${SELECT_CLASS} w-auto`}
          value={filters.stage}
          onChange={(e) => onChange({ stage: e.target.value as CandidateStage | "" })}
        >
          <option value="">{t("All stages")}</option>
          {CANDIDATE_STAGES.map((s) => (
            <option key={s} value={s}>
              {stageLabel(s)}
            </option>
          ))}
        </select>
        <select
          className={`${SELECT_CLASS} w-auto`}
          value={filters.source}
          onChange={(e) => onChange({ source: e.target.value as CandidateSource | "" })}
        >
          <option value="">{t("All sources")}</option>
          {CANDIDATE_SOURCES.map((s) => (
            <option key={s} value={s}>
              {sourceLabel(s)}
            </option>
          ))}
        </select>
        <select
          className={`${SELECT_CLASS} w-auto`}
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value as CandidateStatus | "" })}
        >
          <option value="">{t("All statuses")}</option>
          {CANDIDATE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          className={`${SELECT_CLASS} w-auto`}
          value={filters.tag}
          onChange={(e) => onChange({ tag: e.target.value })}
        >
          <option value="">{t("All tags")}</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className={`${SELECT_CLASS} w-auto`}
          value={sort}
          onChange={(e) => setSort(e.target.value as typeof sort)}
        >
          <option value="updated">{t("Last activity")}</option>
          <option value="name">{t("Name")}</option>
          <option value="stage">{t("Stage")}</option>
          <option value="rating">{t("Rating")}</option>
          <option value="fit">{t("Job-fit score")}</option>
        </select>
      </div>

      {rows.length === 0 ? (
        <HiringEmptyState
          title={t("No candidates match")}
          description={t("Add someone to a job or the talent pool, or loosen the filters.")}
          action={
            canManage ? (
              <Button size="sm" onClick={onAdd}>
                {t("Add candidate")}</Button>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-sm border border-line bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2.5 font-medium">{t("Candidate")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Source")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Stage")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Status")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Fit")}</th>
                  <th className="px-3 py-2.5 font-medium" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-line last:border-0 hover:bg-surface-2/80"
                  >
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left"
                        onClick={() => onOpen(c.id)}
                      >
                        <UserAvatar name={c.fullName} size="sm" />
                        <span>
                          <span className="block font-semibold text-ink">{c.fullName}</span>
                          <span className="block text-xs text-ink-muted">{c.appliedJobTitle}</span>
                          {duplicateIds.has(c.id) ? (
                            <span className="text-[10px] font-semibold uppercase text-warn">
                              {t("Possible duplicate")}
                            </span>
                          ) : null}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-3">
                      <SourceChip source={c.source} />
                    </td>
                    <td className="px-3 py-3 text-sm text-ink-muted">
                      {stageLabel(c.currentStage)}
                    </td>
                    <td className="px-3 py-3">
                      <CandidateStatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-3">
                      <div className="w-[90px]">
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
                      </div>
                    </td>
                    <td className="px-3 py-3 text-end">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => onOpen(c.id)}>
                          {t("Open")}
                        </Button>
                        {canManage ? (
                          <Button size="sm" variant="ghost" onClick={() => onRemove(c.id)}>
                            {t("Remove")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
