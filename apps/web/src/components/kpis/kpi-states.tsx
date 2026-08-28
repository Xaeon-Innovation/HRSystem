import type { ReactNode } from "react";
import { AlertCircle, ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function KpiLoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading performance">
      <div className="h-20 animate-pulse rounded-xl bg-white/70 ring-1 ring-border" />
      <div className="h-36 animate-pulse rounded-xl bg-white/70 ring-1 ring-border" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-xl bg-white/70 ring-1 ring-border"
        />
      ))}
    </div>
  );
}

export function KpiErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <Card className="border-destructive/30 bg-rose-50/60">
      <CardContent className="flex flex-col items-start gap-3 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium">Couldn’t load performance</p>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
        <Button onClick={onRetry} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
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

export function IncompleteBanner({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {count} metric{count === 1 ? "" : "s"} still need a result. The overall score only
        uses metrics that already have a number.
      </p>
    </div>
  );
}
