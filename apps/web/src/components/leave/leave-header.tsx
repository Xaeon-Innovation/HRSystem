"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/elevora";
import { t } from "@/i18n";

export function LeaveHeader({
  isAdmin,
  onNew,
}: {
  isAdmin: boolean;
  onNew: () => void;
}) {
  return (
    <PageHeader
      title={t("Leave")}
      subtitle={
        isAdmin
          ? t("Review requests, watch who is off, and keep balances and accrual rules in one place.")
          : t("Check your remaining days, file time off, and follow the status of each request.")
      }
      actions={
        <Button size="sm" className="w-full sm:w-auto" onClick={onNew}>
          <Plus className="h-4 w-4" />
          {t("New leave request")}
        </Button>
      }
    />
  );
}
