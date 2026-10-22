"use client";

import { useState } from "react";
import { GripVertical } from "lucide-react";
import { Kanban, KanbanCard, KanbanColumn } from "@/components/elevora";
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
import { t } from "@/i18n";

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
    <div className="min-w-0">
      <Kanban>
        {stages.map((stage) => {
          const col = candidates.filter((c) => c.currentStage === stage);
          return (
            <KanbanColumn
              key={stage}
              title={stageLabel(stage)}
              count={col.length}
              className={cn(
                "min-h-[380px]",
                over === stage && "ring-2 ring-accent/40",
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
              {col.length === 0 ? (
                <p className="px-1 py-6 text-center text-2xs text-ink-muted">
                  {t("Drop a candidate here")}
                </p>
              ) : (
                col.map((c) => {
                  const days = daysInStageNow(currentStageEnteredAt(c));
                  const aging = days >= AGING_STAGE_DAYS;
                  const stuck = days >= STUCK_STAGE_DAYS;
                  return (
                    <KanbanCard
                      key={c.id}
                      className={cn(
                        dragging === c.id && "opacity-60",
                        stuck && "border-danger/40",
                        aging && !stuck && "border-warn/40",
                      )}
                    >
                      <article
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
                      >
                        <div className="flex items-start gap-2">
                          {canMove ? (
                            <GripVertical
                              className="mt-1 h-3.5 w-3.5 shrink-0 text-ink-muted"
                              aria-hidden
                            />
                          ) : null}
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-start"
                            onClick={() => onOpen(c.id)}
                          >
                            <div className="flex items-center gap-2">
                              <UserAvatar name={c.fullName} size="sm" />
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-ink">
                                  {c.fullName}
                                </p>
                                <p className="truncate text-[11px] text-ink-muted">
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
                              {c.tags.slice(0, 2).map((tag) => (
                                <TagChip key={tag} label={tag} />
                              ))}
                            </div>
                            <p
                              className={cn(
                                "mt-2 text-[11px] tabular-nums",
                                stuck
                                  ? "font-medium text-danger"
                                  : aging
                                    ? "text-warn"
                                    : "text-ink-muted",
                              )}
                            >
                              {formatDays(days)} {t("in stage")}
                              {c.rating ? ` · ${c.rating}/5` : ""}
                            </p>
                          </button>
                        </div>
                        {canManage ? (
                          <button
                            type="button"
                            className="mt-2 text-[11px] font-medium text-accent hover:underline"
                            onClick={() => onSaveBestFit(c.id)}
                          >
                            {t("Save as best fit")}
                          </button>
                        ) : null}
                        {canMove ? (
                          <label className="mt-2 block">
                            <span className="sr-only">
                              {t("Move")} {c.fullName} {t("to stage")}
                            </span>
                            <select
                              className="h-9 w-full rounded-sm border border-line bg-surface px-1.5 text-[11px] text-ink"
                              value={c.currentStage}
                              onChange={(e) =>
                                onMove(c.id, e.target.value as CandidateStage)
                              }
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
                    </KanbanCard>
                  );
                })
              )}
            </KanbanColumn>
          );
        })}
      </Kanban>
      {candidates.length === 0 ? (
        <div className="mt-3">
          <HiringEmptyState
            title={t("No candidates in this view")}
            description={t("Add a candidate or clear filters to see the pipeline.")}
          />
        </div>
      ) : null}
      {canMove ? (
        <p className="mt-2 text-xs text-ink-muted">
          {t("Drag cards between columns, or use the stage menu on each card for keyboard access.")}
        </p>
      ) : null}
    </div>
  );
}
