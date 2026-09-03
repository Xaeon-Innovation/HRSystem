"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatPercent, sourceLabel, stageLabel } from "@/lib/hiring/format";
import type {
  Candidate,
  HiringAlert,
  Interview,
  Offer,
  RecruitmentMetricSummary,
} from "@/lib/hiring/types";
import { OfferStatusBadge, StageBadge } from "@/components/hiring/hiring-status-badge";

export function HiringHomePanel({
  summary,
  alerts,
  interviewsToday,
  pendingOffers,
  stuck,
  onOpenCandidate,
  onOpenInterview,
  onOpenOffer,
  onGoPipeline,
  onGoInterviews,
  onGoOffers,
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
  const funnelMax = Math.max(1, ...summary.stageCounts.map((s) => s.count));

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Pipeline funnel</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                People in each stage right now. Drag the board to move them.
              </p>
            </div>
            <button type="button" className="text-xs text-primary hover:underline" onClick={onGoPipeline}>
              Open pipeline
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {summary.stageCounts
            .filter((s) => s.stage !== "rejected")
            .map((s) => (
              <div key={s.stage}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.count}
                    {s.avgDays != null && s.count > 0 ? ` · ${s.avgDays}d avg` : ""}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300"
                    style={{ width: `${Math.max(s.count ? 8 : 0, (s.count / funnelMax) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Needs attention</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Pipeline looks healthy.</p>
          ) : (
            alerts.slice(0, 6).map((a) => (
              <button
                key={a.id}
                type="button"
                className="flex w-full flex-col rounded-lg border bg-card px-3 py-2 text-left hover:bg-accent/40"
                onClick={() => {
                  if (a.candidateId) onOpenCandidate(a.candidateId);
                  else if (a.interviewId) onOpenInterview(a.interviewId);
                  else if (a.offerId) onOpenOffer(a.offerId);
                }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{a.title}</span>
                  <span
                    className={
                      a.severity === "urgent"
                        ? "text-[10px] font-semibold uppercase text-rose-700"
                        : a.severity === "warning"
                          ? "text-[10px] font-semibold uppercase text-amber-800"
                          : "text-[10px] font-semibold uppercase text-sky-800"
                    }
                  >
                    {a.severity}
                  </span>
                </span>
                <span className="mt-0.5 text-xs text-muted-foreground">{a.detail}</span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Today’s interviews</CardTitle>
            <button type="button" className="text-xs text-primary hover:underline" onClick={onGoInterviews}>
              Calendar
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {interviewsToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing on the calendar today.</p>
          ) : (
            interviewsToday.map((i) => (
              <button
                key={i.id}
                type="button"
                className="flex w-full flex-col rounded-lg border bg-card px-3 py-2 text-left hover:bg-accent/40"
                onClick={() => onOpenCandidate(i.candidateId)}
              >
                <span className="font-medium">{i.candidateName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(i.scheduledAt)} · {i.interviewerNames.join(", ")}
                </span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Offers in flight</CardTitle>
            <button type="button" className="text-xs text-primary hover:underline" onClick={onGoOffers}>
              All offers
            </button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {pendingOffers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No offers waiting.</p>
          ) : (
            pendingOffers.map((o) => (
              <button
                key={o.id}
                type="button"
                className="flex w-full flex-col rounded-lg border bg-card px-3 py-2 text-left hover:bg-accent/40"
                onClick={() => onOpenOffer(o.id)}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium">{o.candidateName}</span>
                  <OfferStatusBadge status={o.status} />
                </span>
                <span className="text-xs text-muted-foreground">{o.offeredTitle}</span>
              </button>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Source performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {summary.sourcePerformance.length === 0 ? (
            <p className="text-sm text-muted-foreground">No source data yet.</p>
          ) : (
            summary.sourcePerformance
              .slice()
              .sort((a, b) => b.candidates - a.candidates)
              .map((s) => (
                <div key={s.source} className="flex items-center justify-between text-sm">
                  <span>{sourceLabel(s.source)}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {s.hired}/{s.candidates} hired · {formatPercent(s.hireRate)}
                  </span>
                </div>
              ))
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Aging in stage</CardTitle>
        </CardHeader>
        <CardContent>
          {stuck.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one is sitting too long in a stage.</p>
          ) : (
            <ul className="divide-y">
              {stuck.slice(0, 8).map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="font-medium">{c.fullName}</p>
                    <p className="text-xs text-muted-foreground">{c.appliedJobTitle}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StageBadge stage={c.currentStage} />
                    <Button size="sm" variant="ghost" onClick={() => onOpenCandidate(c.id)}>
                      Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { stageLabel };
