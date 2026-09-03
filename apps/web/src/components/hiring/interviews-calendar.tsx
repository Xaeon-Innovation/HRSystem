"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { HiringEmptyState } from "@/components/hiring/hiring-states";
import {
  InterviewStatusBadge,
  OutcomeBadge,
} from "@/components/hiring/hiring-status-badge";
import {
  formatDate,
  formatDateTime,
  interviewModeLabel,
  interviewTypeLabel,
  sameDay,
  SELECT_CLASS,
  toIsoDate,
} from "@/lib/hiring/format";
import type { Interview, InterviewStatus } from "@/lib/hiring/types";
import { INTERVIEW_STATUSES } from "@/lib/hiring/types";

export function InterviewsCalendar({
  interviews,
  canSchedule,
  onSchedule,
  onOpenCandidate,
  onScore,
  onReschedule,
  onNoShow,
  onConfirm,
}: {
  interviews: Interview[];
  canSchedule: boolean;
  onSchedule: () => void;
  onOpenCandidate: (id: string) => void;
  onScore: (id: string) => void;
  onReschedule: (id: string) => void;
  onNoShow: (id: string) => void;
  onConfirm: (id: string) => void;
}) {
  const [day, setDay] = useState(() => toIsoDate(new Date()));
  const [status, setStatus] = useState<InterviewStatus | "">("");

  const days = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() - 1);
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return toIsoDate(d);
    });
  }, []);

  const filtered = interviews.filter((i) => {
    if (status && i.status !== status) return false;
    return true;
  });
  const onDay = filtered.filter((i) => sameDay(i.scheduledAt, day));
  const upcoming = filtered.filter((i) => i.scheduledAt.slice(0, 10) >= toIsoDate(new Date()));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {days.map((d) => {
            const count = interviews.filter((i) => sameDay(i.scheduledAt, d) && i.status !== "cancelled").length;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDay(d)}
                className={
                  day === d
                    ? "rounded-lg bg-primary px-3 py-2 text-left text-primary-foreground"
                    : "rounded-lg border bg-card px-3 py-2 text-left hover:bg-accent/40"
                }
              >
                <p className="text-xs opacity-80">{formatDate(d)}</p>
                <p className="text-sm font-semibold tabular-nums">{count}</p>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2">
          <select
            className={`${SELECT_CLASS} w-auto`}
            value={status}
            onChange={(e) => setStatus(e.target.value as InterviewStatus | "")}
          >
            <option value="">All statuses</option>
            {INTERVIEW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          {canSchedule ? (
            <Button size="sm" onClick={onSchedule}>
              Schedule
            </Button>
          ) : null}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{formatDate(day)}</h3>
        {onDay.length === 0 ? (
          <HiringEmptyState
            title="No interviews this day"
            description="Pick another day on the strip, or schedule a screen."
            action={
              canSchedule ? (
                <Button size="sm" onClick={onSchedule}>
                  Schedule interview
                </Button>
              ) : null
            }
          />
        ) : (
          onDay.map((i) => (
            <InterviewRow
              key={i.id}
              interview={i}
              onOpenCandidate={onOpenCandidate}
              onScore={onScore}
              onReschedule={onReschedule}
              onNoShow={onNoShow}
              onConfirm={onConfirm}
            />
          ))
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Upcoming</h3>
        {upcoming.slice(0, 12).map((i) => (
          <InterviewRow
            key={i.id}
            interview={i}
            compact
            onOpenCandidate={onOpenCandidate}
            onScore={onScore}
            onReschedule={onReschedule}
            onNoShow={onNoShow}
            onConfirm={onConfirm}
          />
        ))}
      </div>
    </div>
  );
}

function InterviewRow({
  interview: i,
  compact,
  onOpenCandidate,
  onScore,
  onReschedule,
  onNoShow,
  onConfirm,
}: {
  interview: Interview;
  compact?: boolean;
  onOpenCandidate: (id: string) => void;
  onScore: (id: string) => void;
  onReschedule: (id: string) => void;
  onNoShow: (id: string) => void;
  onConfirm: (id: string) => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 py-3">
        <button type="button" className="min-w-0 text-left" onClick={() => onOpenCandidate(i.candidateId)}>
          <p className="font-semibold">{i.candidateName}</p>
          <p className="text-xs text-muted-foreground">
            {i.jobTitle} · {interviewTypeLabel(i.type)} · {interviewModeLabel(i.mode)} ·{" "}
            {i.durationMinutes}m
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDateTime(i.scheduledAt)} · {i.interviewerNames.join(", ")}
            {i.meetingLink ? " · online link saved" : i.location ? ` · ${i.location}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Candidate confirmation: {i.confirmationStatus}
          </p>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <InterviewStatusBadge status={i.status} />
          <OutcomeBadge outcome={i.outcome} />
          {!compact ? (
            <>
              {i.confirmationStatus !== "confirmed" && i.status === "scheduled" ? (
                <Button size="sm" variant="outline" onClick={() => onConfirm(i.id)}>
                  Mark confirmed
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => onReschedule(i.id)}>
                Reschedule
              </Button>
              {i.status !== "no_show" && i.status !== "completed" ? (
                <Button size="sm" variant="ghost" onClick={() => onNoShow(i.id)}>
                  No-show
                </Button>
              ) : null}
              <Button size="sm" onClick={() => onScore(i.id)}>
                Scorecard
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" onClick={() => onOpenCandidate(i.candidateId)}>
              Open
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
