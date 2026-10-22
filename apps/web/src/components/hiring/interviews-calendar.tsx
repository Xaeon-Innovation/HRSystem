"use client";

import { useMemo, useState } from "react";
import { ListRow } from "@/components/elevora";
import { Button } from "@/components/ui/button";
import { HiringEmptyState } from "@/components/hiring/hiring-states";
import {
  formatDate,
  formatDateTime,
  interviewModeLabel,
  interviewTypeLabel,
  SELECT_CLASS,
  toIsoDate,
} from "@/lib/hiring/format";
import type { Interview, InterviewStatus } from "@/lib/hiring/types";
import { INTERVIEW_STATUSES } from "@/lib/hiring/types";
import { t } from "@/i18n";

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
  const [status, setStatus] = useState<InterviewStatus | "">("");

  const week = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const day = start.getDay();
    start.setDate(start.getDate() - day);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return toIsoDate(d);
    });
  }, []);

  const filtered = interviews.filter((i) => {
    if (status && i.status !== status) return false;
    return true;
  });

  const weekItems = filtered
    .filter((i) => {
      const d = i.scheduledAt.slice(0, 10);
      return d >= week[0]! && d <= week[6]!;
    })
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  const scoreFocus = weekItems[0] ?? filtered[0] ?? null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <select
          className={`${SELECT_CLASS} w-full sm:w-auto`}
          value={status}
          onChange={(e) => setStatus(e.target.value as InterviewStatus | "")}
        >
          <option value="">{t("All statuses")}</option>
          {INTERVIEW_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        {canSchedule ? (
          <Button size="sm" className="w-full sm:ms-auto sm:w-auto" onClick={onSchedule}>
            {t("Schedule")}
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-12">
        <section className="rounded-sm border border-line bg-surface p-4 lg:col-span-7">
          <h2 className="mb-3 text-base font-semibold text-ink">{t("This week")}</h2>
          {weekItems.length === 0 ? (
            <HiringEmptyState
              title={t("No interviews this week")}
              description={t("Schedule a screen or pick another status filter.")}
              action={
                canSchedule ? (
                  <Button size="sm" onClick={onSchedule}>
                    {t("Schedule interview")}
                  </Button>
                ) : null
              }
            />
          ) : (
            <div>
              {weekItems.map((i) => {
                const d = new Date(i.scheduledAt);
                const dayLabel = d.toLocaleDateString(undefined, { weekday: "short" });
                const dayNum = String(d.getDate()).padStart(2, "0");
                const time = d.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <div
                    key={i.id}
                    className="flex flex-col gap-2 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center"
                  >
                    <div className="flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-[10px] bg-surface-2">
                      <span className="text-2xs text-ink-muted">{dayLabel}</span>
                      <b className="text-sm tabular-nums text-ink">{dayNum}</b>
                    </div>
                    <div className="min-w-0 flex-1">
                      <ListRow
                        className="border-b-0 py-0"
                        title={i.candidateName}
                        subtitle={`${interviewTypeLabel(i.type)} · ${time}`}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1 sm:justify-end">
                      <Button size="sm" className="w-full sm:w-auto" onClick={() => onScore(i.id)}>
                        {t("Scorecard")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() => onOpenCandidate(i.candidateId)}
                      >
                        {t("Open")}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={() => onReschedule(i.id)}
                      >
                        {t("Reschedule")}
                      </Button>
                      {i.status !== "no_show" && i.status !== "completed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full sm:w-auto"
                          onClick={() => onNoShow(i.id)}
                        >
                          {t("No-show")}
                        </Button>
                      ) : null}
                      {i.confirmationStatus !== "confirmed" && i.status === "scheduled" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full sm:w-auto"
                          onClick={() => onConfirm(i.id)}
                        >
                          {t("Confirm")}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-sm border border-line bg-surface p-4 lg:col-span-5">
          {scoreFocus ? (
            <>
              <h2 className="text-base font-semibold text-ink">
                {t("Scorecard")} · {scoreFocus.candidateName}
              </h2>
              <p className="text-xs text-ink-muted">
                {interviewTypeLabel(scoreFocus.type)} · {scoreFocus.jobTitle}
              </p>
              <HiringEmptyState
                title={t("Open the scorecard to rate")}
                description={t(
                  "Ratings appear here after you submit a real scorecard.",
                )}
              />
              <Button
                size="sm"
                className="mt-1 w-full"
                onClick={() => onScore(scoreFocus.id)}
              >
                {t("Open full scorecard")}
              </Button>
            </>
          ) : (
            <HiringEmptyState
              title={t("No scorecard yet")}
              description={t("Score an interview to fill this panel.")}
            />
          )}
        </section>
      </div>

      <section className="rounded-sm border border-line bg-surface p-4">
        <h3 className="mb-2 text-sm font-semibold text-ink">{t("All upcoming")}</h3>
        {filtered.filter((i) => i.scheduledAt.slice(0, 10) >= toIsoDate(new Date())).length ===
        0 ? (
          <p className="text-sm text-ink-muted">{t("Nothing scheduled ahead.")}</p>
        ) : (
          filtered
            .filter((i) => i.scheduledAt.slice(0, 10) >= toIsoDate(new Date()))
            .slice(0, 8)
            .map((i) => (
              <button
                key={i.id}
                type="button"
                className="block w-full text-left"
                onClick={() => onOpenCandidate(i.candidateId)}
              >
                <ListRow
                  title={i.candidateName}
                  subtitle={`${formatDateTime(i.scheduledAt)} · ${interviewModeLabel(i.mode)}`}
                  value={formatDate(i.scheduledAt.slice(0, 10))}
                />
              </button>
            ))
        )}
      </section>
    </div>
  );
}
