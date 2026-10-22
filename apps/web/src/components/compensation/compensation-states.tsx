import type { ReactNode } from "react";
import { AlertCircle, RefreshCw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { EmptyState, Notice } from "@/components/elevora";
import { t } from "@/i18n";

export function CompLoadingSkeleton() {
  return <PageSkeleton />;
}

export function CompErrorState({
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
          <p className="font-medium text-ink">{t("Couldn’t load compensation")}</p>
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
    <Card className="overflow-hidden border-line bg-surface p-0">
      <EmptyState
        icon={<Wallet className="h-5 w-5" />}
        title={title}
        subtitle={description}
        action={action}
      />
    </Card>
  );
}

export function CompAccessDenied() {
  return (
    <Card className="overflow-hidden border-line bg-surface p-0">
      <EmptyState
        icon={<Wallet className="h-5 w-5" />}
        title={t("Compensation is restricted")}
        subtitle={t(
          "Salary and payroll inputs are only available to HR admins and authorized managers. Use Profile or Alerts for your own updates.",
        )}
      />
    </Card>
  );
}
