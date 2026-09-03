import type { ReactNode } from "react";
import { AlertCircle, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function CompLoadingSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading compensation">
      <div className="h-20 animate-pulse rounded-xl bg-card ring-1 ring-border" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-card ring-1 ring-border" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-card ring-1 ring-border" />
    </div>
  );
}

export function CompErrorState({
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
            <p className="font-medium">Couldn’t load compensation</p>
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

export function CompEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Wallet className="h-6 w-6" />
        </div>
        <p className="text-base font-semibold">{title}</p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        {action ? <div className="mt-5">{action}</div> : null}
      </CardContent>
    </Card>
  );
}

export function CompAccessDenied() {
  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/40">
      <CardContent className="py-12 text-center">
        <p className="text-base font-semibold">Compensation is restricted</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          Salary and payroll inputs are only available to HR admins and authorized managers.
          Use Profile or Alerts for your own updates.
        </p>
      </CardContent>
    </Card>
  );
}
