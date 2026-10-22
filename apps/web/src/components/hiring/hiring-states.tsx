import type { ReactNode } from "react";
import { AlertCircle, Briefcase, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState, Notice } from "@/components/elevora";
import { t } from "@/i18n";

export function HiringLoadingSkeleton() {
  return <PageSkeleton dense />;
}

export function HiringErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-sm border border-line bg-surface p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <Notice tone="warn" className="flex-1 border-danger/30 bg-danger/10">
          <span className="flex gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
            <span>
              <p className="font-medium text-ink">{t("Couldn’t load hiring")}</p>
              <p className="mt-0.5 text-ink-muted">{message}</p>
            </span>
          </span>
        </Notice>
        <Button onClick={onRetry} variant="outline" size="sm" className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4" />
          {t("Try again")}
        </Button>
      </div>
    </div>
  );
}

export function HiringEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-sm border border-dashed border-line bg-surface">
      <EmptyState
        icon={<Briefcase className="h-5 w-5" />}
        title={title}
        subtitle={description}
        action={action}
      />
    </div>
  );
}

export function HiringAccessDenied() {
  return (
    <Notice tone="warn" className="py-8 text-center">
      <p className="text-base font-semibold text-ink">{t("Hiring is restricted")}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
        {t(
          "Job openings, candidates, and interviews are available to HR, hiring managers, and assigned interviewers.",
        )}
      </p>
    </Notice>
  );
}
