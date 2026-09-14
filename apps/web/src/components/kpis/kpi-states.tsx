import type { ReactNode } from "react";
import { AlertCircle, ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PageSkeleton } from "@/components/ui/page-skeleton";
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
    <Card className="border-destructive/30 bg-rose-50/60 dark:bg-rose-950/40">
      <CardContent className="flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium">{t("Couldn’t load performance")}</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" />
          {t("Try again")}</Button>
      </CardContent>
    </Card>
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
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <ClipboardList className="h-6 w-6" />
        </div>
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        {steps && steps.length > 0 ? (
          <ol className="mt-4 max-w-sm space-y-1 text-left text-sm text-foreground/90">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold text-primary">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ) : null}
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
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
        {count} {t("metric")}{count === 1 ? "" : "s"} {t("still need a result. The overall score only uses metrics that already have a number.")}{onDrill ? (
          <span className="mt-0.5 block text-xs font-medium opacity-90">
            {active ? t("Showing metrics without results, tap again to clear.") : t("Tap to list them.")}
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
          "flex w-full items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
          active && "ring-2 ring-amber-400/60",
        )}
      >
        {body}
      </button>
    );
  }

  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
      {body}
    </div>
  );
}
