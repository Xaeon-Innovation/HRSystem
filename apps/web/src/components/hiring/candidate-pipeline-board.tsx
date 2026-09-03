"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { HiringEmptyState } from "@/components/hiring/hiring-states";
import { SourceChip, TagChip } from "@/components/hiring/hiring-status-badge";
import { cn } from "@/lib/utils";
import { daysInStageNow, formatDays, stageLabel } from "@/lib/hiring/format";
import { currentStageEnteredAt } from "@/lib/hiring/reports";
import { AGING_STAGE_DAYS, STUCK_STAGE_DAYS } from "@/lib/hiring/workflow";
import { FitScoreBadge } from "@/components/hiring/fit-score-badge";
import type { FitScoreResult } from "@/lib/hiring/fit-score";
import { CANDIDATE_STAGES, type Candidate, type CandidateStage } from "@/lib/hiring/types";

export function CandidatePipelineBoard({
  candidates,
  fits,
  canMove,
  canManage,
  onOpen,
  onMove,
  onSaveBestFit,
}: {
  candidates: Candidate[];
  fits: Record<string, FitScoreResult>;
  canMove: boolean;
  canManage: boolean;
  onOpen: (id: string) => void;
  onMove: (id: string, stage: CandidateStage) => void;
  onSaveBestFit: (id: string) => void;
}) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<CandidateStage | null>(null);
  const stages = CANDIDATE_STAGES;

  return (
    <div className="-mx-1 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-3 px-1">
        {stages.map((stage) => {
          const col = candidates.filter((c) => c.currentStage === stage);
          return (
            <section
              key={stage}
              className={cn(
                "flex w-[17.5rem] shrink-0 flex-col rounded-xl border bg-card",
                over === stage && "ring-2 ring-primary/40",
              )}
              onDragOver={(e) => {
                if (!canMove) return;
                e.preventDefault();
                setOver(stage);
              }}
              onDragLeave={() => {
                if (over === stage) setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/candidate-id");
                setOver(null);
                setDragging(null);
                if (id && canMove) onMove(id, stage);
              }}
            >
              <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
                <h3 className="text-sm font-semibold">{stageLabel(stage)}</h3>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold tabular-nums">
                  {col.length}
                </span>
              </header>
              <div className="flex min-h-[12rem] flex-col gap-2 p-2">
                {col.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    Drop a candidate here
                  </p>
                ) : (
                  col.map((c) => {
                    const days = daysInStageNow(currentStageEnteredAt(c));
                    const aging = days >= AGING_STAGE_DAYS;
                    const stuck = days >= STUCK_STAGE_DAYS;
                    return (
                      <article
                        key={c.id}
                        draggable={canMove}
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/candidate-id", c.id);
                          e.dataTransfer.effectAllowed = "move";
                          setDragging(c.id);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setOver(null);
                        }}
                        className={cn(
                          "rounded-lg border bg-card p-2.5 shadow-sm transition hover:border-primary/30 hover:shadow-md",
                          dragging === c.id && "opacity-60",
                          stuck && "border-rose-200",
                          aging && !stuck && "border-amber-200",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          {canMove ? (
                            <GripVertical
                              className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                              aria-hidden
                            />
                          ) : null}
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => onOpen(c.id)}
                          >
                            <div className="flex items-center gap-2">
                              <UserAvatar name={c.fullName} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{c.fullName}</p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {c.appliedJobTitle}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-1">
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
                              <SourceChip source={c.source} />
                              {c.tags.slice(0, 2).map((t) => (
                                <TagChip key={t} label={t} />
                              ))}
                            </div>
                            <p
                              className={cn(
                                "mt-2 text-[11px] tabular-nums",
                                stuck
                                  ? "font-medium text-rose-700"
                                  : aging
                                    ? "text-amber-800"
                                    : "text-muted-foreground",
                              )}
                            >
                              {formatDays(days)} in stage
                              {c.rating ? ` · ${c.rating}/5` : ""}
                            </p>
                          </button>
                        </div>
                        {canManage ? (
                          <button
                            type="button"
                            className="mt-2 text-[11px] font-medium text-primary hover:underline"
                            onClick={() => onSaveBestFit(c.id)}
                          >
                            Save as best fit
                          </button>
                        ) : null}
                        {canMove ? (
                          <label className="mt-2 block">
                            <span className="sr-only">Move {c.fullName} to stage</span>
                            <select
                              className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-[11px]"
                              value={c.currentStage}
                              onChange={(e) => onMove(c.id, e.target.value as CandidateStage)}
                            >
                              {stages.map((s) => (
                                <option key={s} value={s}>
                                  {stageLabel(s)}
                                </option>
                              ))}
                            </select>
                          </label>
                        ) : null}
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          );
        })}
      </div>
      {candidates.length === 0 ? (
        <div className="mt-3">
          <HiringEmptyState
            title="No candidates in this view"
            description="Add a candidate or clear filters to see the pipeline."
          />
        </div>
      ) : null}
      {canMove ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Drag cards between columns, or use the stage menu on each card for keyboard access.
        </p>
      ) : null}
    </div>
  );
}
