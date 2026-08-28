import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatPercent } from "@/lib/kpis/format";
import type { ReviewsModel } from "@/lib/kpis/types";

const APPRAISAL: Record<ReviewsModel["appraisalStatus"], string> = {
  not_started: "Not started",
  in_progress: "In progress",
  completed: "Completed",
  overdue: "Overdue",
};

const PIP: Record<ReviewsModel["pipStatus"], string> = {
  none: "None",
  recommended: "Recommended",
  active: "Active",
};

export function KpiReviewsPanel({ reviews }: { reviews: ReviewsModel }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Reviews & actions</CardTitle>
        <p className="text-xs text-muted-foreground">
          Appraisal progress, feedback, and the next action to take
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Block title="Latest manager review">
          {reviews.managerReview ? (
            <>
              <p className="text-sm font-medium">{reviews.managerReview.reviewer}</p>
              <p className="text-xs text-muted-foreground">{formatDate(reviews.managerReview.date)}</p>
              <p className="mt-2 text-sm leading-relaxed">{reviews.managerReview.notes}</p>
            </>
          ) : (
            <Empty text="No manager review notes in this period." />
          )}
        </Block>
        <Block title="Self-assessment">
          {reviews.selfAssessment ? (
            <p className="text-sm">{reviews.selfAssessment.notes}</p>
          ) : (
            <Empty text="Self-assessment is not in this cycle yet." />
          )}
        </Block>
        <Block title="Peer feedback">
          {reviews.peerFeedback ? (
            <p className="text-sm">{reviews.peerFeedback.summary}</p>
          ) : (
            <Empty text="No peer feedback summary available." />
          )}
        </Block>
        <Block title="Appraisal status">
          <p className="text-lg font-semibold">{APPRAISAL[reviews.appraisalStatus]}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Next review {formatDate(reviews.nextReviewDate)}
          </p>
        </Block>
        <Block title="Improvement plan">
          <p className="text-lg font-semibold">{PIP[reviews.pipStatus]}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Suggested when overall score is under 70.
          </p>
        </Block>
        <Block title="Training recommendations" className="md:col-span-2 xl:col-span-3">
          {reviews.trainingRecommendations.length === 0 ? (
            <Empty text="No training actions flagged from current gaps." />
          ) : (
            <ul className="list-disc space-y-1 pl-4 text-sm">
              {reviews.trainingRecommendations.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          )}
        </Block>
        <Block title="Goal completion context">
          <p className="text-sm text-muted-foreground">
            Rating trend is visible in the charts above. Use the KPI table to evidence each score
            before the next review date.
          </p>
          {reviews.managerReview?.rating != null ? (
            <p className="mt-2 text-sm">
              Latest linked rating {formatPercent(reviews.managerReview.rating, 0)}
            </p>
          ) : null}
        </Block>
      </CardContent>
    </Card>
  );
}

function Block({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border bg-secondary/30 p-3 ${className ?? ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}
