"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

export function LeaveHeader({
  isAdmin,
  onNew,
}: {
  isAdmin: boolean;
  onNew: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-xl min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{t("Leave")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? t("Review requests, watch who is off, and keep balances and accrual rules in one place.")
            : t("Check your remaining days, file time off, and follow the status of each request.")}
        </p>
      </div>
      <Button size="sm" className="w-full sm:w-auto" onClick={onNew}>
        <Plus className="h-4 w-4" />
        {t("New leave request")}</Button>
    </div>
  );
}
