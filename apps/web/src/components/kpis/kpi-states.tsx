import type { ReactNode } from "react";
import { AlertCircle, ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState, Notice } from "@/components/elevora";
import { t } from "@/i18n";

export function KpiLoadingSkeleton() {
  return <PageSkeleton dense />;
}

export function KpiErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Notice tone="warn" className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-warn" />
        <div>
          <p className="font-medium text-ink">{t("Couldn’t load performance")}</p>
          <p className="text-sm text-ink-muted">{message}</p>
        </div>
      </div>
      <Button onClick={onRetry} variant="outline" size="sm" className="w-full sm:w-auto">
        <RefreshCw className="h-4 w-4" />
        {t("Try again")}
      </Button>
    </Notice>
  );
}

export function KpiEmptyState({
  title,
  description,
  steps,
  action,
}: {
  title: string;
  description: string;
  steps?: string[];
  action?: ReactNode;
}) {
  return (
    <Card className="overflow-hidden border-line bg-surface p-0">
      <EmptyState
        icon={<ClipboardList className="h-5 w-5" />}
        title={title}
        subtitle={description}
        action={action}
      />
      {steps && steps.length > 0 ? (
        <ol className="mx-auto mb-8 max-w-sm space-y-1 px-4 pb-6 text-left text-sm text-ink-2">
          {steps.map((step, i) => (
            <li key={step} className="flex gap-2">
              <span className="font-semibold text-accent">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      ) : null}
    </Card>
  );
}

export function IncompleteBanner({
  count,
  onDrill,
  active,
}: {
  count: number;
  onDrill?: () => void;
  active?: boolean;
}) {
  if (count <= 0) return null;
  const body = (
    <>
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="text-left">
        {count} {t("metric")}
        {count === 1 ? "" : "s"}{" "}
        {t("still need a result. The overall score only uses metrics that already have a number.")}
        {onDrill ? (
          <span className="mt-0.5 block text-xs font-medium opacity-90">
            {active
              ? t("Showing metrics without results, tap again to clear.")
              : t("Tap to list them.")}
          </span>
        ) : null}
      </p>
    </>
  );

  if (onDrill) {
    return (
      <button
        type="button"
        onClick={onDrill}
        className={cn(
          "flex w-full items-start gap-2 rounded-sm border border-warn/30 bg-warn/10 px-3 py-2 text-sm text-ink",
          active && "ring-2 ring-warn/40",
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <Notice tone="warn" className="flex items-start gap-2">
      {body}
    </Notice>
  );
}
