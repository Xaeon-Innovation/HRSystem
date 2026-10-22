"use client";

import { Chip, HatchBar, ListRow } from "@/components/elevora";
import { UserAvatar } from "@/components/user-avatar";
import {
  formatDateTime,
  interviewModeLabel,
  stageLabel,
} from "@/lib/hiring/format";
import type {
  Candidate,
  HiringAlert,
  Interview,
  Offer,
  RecruitmentMetricSummary,
} from "@/lib/hiring/types";
import { t } from "@/i18n";

const FUNNEL_STAGES: Array<{
  match: (stage: string) => boolean;
  label: string;
}> = [
  { match: (s) => s === "sourced", label: "Sourced" },
  {
    match: (s) => s === "resume_reviewed" || s === "phone_screen",
    label: "Screened",
  },
  { match: (s) => s === "assessment", label: "Assessment" },
  {
    match: (s) =>
      s === "interview_r1" || s === "interview_r2" || s === "final_interview",
    label: "Interviews",
  },
  {
    match: (s) => s === "offer_extended" || s === "offer_accepted",
    label: "Offer",
  },
  { match: (s) => s === "hired", label: "Hired" },
];

export function HiringHomePanel({
  summary,
  alerts,
  interviewsToday,
  pendingOffers: _pendingOffers,
  stuck,
  onOpenCandidate,
  onOpenInterview,
  onOpenOffer,
  onGoPipeline,
  onGoInterviews,
  onGoOffers: _onGoOffers,
}: {
  summary: RecruitmentMetricSummary;
  alerts: HiringAlert[];
  interviewsToday: Interview[];
  pendingOffers: Offer[];
  stuck: Candidate[];
  onOpenCandidate: (id: string) => void;
  onOpenInterview: (id: string) => void;
  onOpenOffer: (id: string) => void;
  onGoPipeline: () => void;
  onGoInterviews: () => void;
  onGoOffers: () => void;
}) {
  void _pendingOffers;
  void _onGoOffers;

  const funnel = FUNNEL_STAGES.map((f, i) => {
    const count = summary.stageCounts
      .filter((s) => f.match(s.stage))
      .reduce((acc, s) => acc + s.count, 0);
    return { ...f, count, index: i };
  });
  const funnelMax = Math.max(1, funnel[0]?.count ?? 1, ...funnel.map((f) => f.count));
  const totalCandidates = summary.stageCounts
    .filter((s) => s.stage !== "rejected")
    .reduce((a, s) => a + s.count, 0);

  const urgentRows = buildUrgentRows(alerts, stuck);

  return (
    <div className="grid gap-3 lg:grid-cols-12">
      <section className="rounded-sm border border-line bg-surface p-4 lg:col-span-8">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-ink">{t("Funnel")}</h2>
            <p className="text-xs text-ink-muted">
              {t("All open roles")} · {totalCandidates} {t("candidates")}
            </p>
          </div>
          <button
            type="button"
            className="text-xs text-accent-strong hover:underline"
            onClick={onGoPipeline}
          >
            {t("Open pipeline")}
          </button>
        </div>
        <div className="space-y-2">
          {funnel.map((row) => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="w-[5.75rem] shrink-0 text-xs text-ink-muted">
                {t(row.label)}
              </span>
              <div className="min-w-0 flex-1">
                <HatchBar
                  size="default"
                  percent={(row.count / funnelMax) * 100}
                  tone={row.index > 3 ? "warn" : "accent"}
                  animate={false}
                />
              </div>
              <b className="w-7 shrink-0 text-end text-sm tabular-nums text-ink">
                {row.count}
              </b>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-sm border border-line bg-surface p-4 lg:col-span-4">
        <h2 className="text-base font-semibold text-ink">{t("Urgent")}</h2>
        <p className="mb-2 text-xs text-ink-muted">
          {t("Stuck stages and hire dates")}
        </p>
        {urgentRows.length === 0 ? (
          <p className="py-4 text-sm text-ink-muted">{t("Pipeline looks healthy.")}</p>
        ) : (
          <div>
            {urgentRows.map((row) => (
              <button
                key={row.id}
                type="button"
                className="block w-full text-left"
                onClick={row.onClick}
              >
                <ListRow
                  leading={<UserAvatar name={row.title} size="sm" />}
                  title={row.title}
                  status={row.statusHint}
                />
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-sm border border-line bg-surface p-4 lg:col-span-12">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-ink">{t("Interviews today")}</h2>
          <button
            type="button"
            className="text-xs text-accent-strong hover:underline"
            onClick={onGoInterviews}
          >
            {t("Calendar")}
          </button>
        </div>
        {interviewsToday.length === 0 ? (
          <p className="py-4 text-sm text-ink-muted">
            {t("Nothing on the calendar today.")}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
            {interviewsToday.map((i) => {
              const time = formatTime(i.scheduledAt);
              return (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => onOpenCandidate(i.candidateId)}
                  className="rounded-[14px] bg-surface-2 p-3.5 text-left transition hover:ring-1 hover:ring-line-strong"
                >
                  <div className="flex items-center justify-between gap-2">
                    <b className="tabular-nums text-ink">{time}</b>
                    <Chip tone="info">{interviewModeLabel(i.mode)}</Chip>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <UserAvatar name={i.candidateName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-ink">{i.candidateName}</p>
                      <p className="truncate text-xs text-ink-muted">
                        {interviewTypeShort(i.type)} · {i.jobTitle}
                      </p>
                    </div>
                  </div>
                  {i.interviewerNames.length > 0 ? (
                    <p className="mt-2 text-2xs text-ink-muted">
                      {t("with")} {i.interviewerNames.join(", ")}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );

  function buildUrgentRows(
    alertList: HiringAlert[],
    stuckList: Candidate[],
  ): Array<{
    id: string;
    title: string;
    statusHint: string;
    onClick: () => void;
  }> {
    const fromAlerts = alertList.slice(0, 4).map((a) => ({
      id: a.id,
      title: a.title,
      statusHint: a.detail,
      onClick: () => {
        if (a.candidateId) onOpenCandidate(a.candidateId);
        else if (a.interviewId) onOpenInterview(a.interviewId);
        else if (a.offerId) onOpenOffer(a.offerId);
      },
    }));
    if (fromAlerts.length > 0) return fromAlerts;
    return stuckList.slice(0, 4).map((c) => ({
      id: c.id,
      title: c.fullName,
      statusHint: `${stageLabel(c.currentStage)} · stuck`,
      onClick: () => onOpenCandidate(c.id),
    }));
  }
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDateTime(iso);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function interviewTypeShort(type: string) {
  const map: Record<string, string> = {
    phone_screen: "Phone screen",
    assessment_review: "Assessment",
    technical: "Technical",
    hiring_manager: "HM interview",
    panel: "Panel",
    final: "Final",
    culture: "Culture",
  };
  return map[type] ?? type;
}

export { stageLabel };
