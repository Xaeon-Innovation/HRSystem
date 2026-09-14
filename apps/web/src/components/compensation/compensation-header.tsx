"use client";

import { Plus, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PreviewBadge } from "@/components/ui/preview-badge";
import { t } from "@/i18n";

export function CompensationHeader({
  isAdmin,
  isManager,
  onNew,
  onHourly,
  preview = false,
}: {
  isAdmin: boolean;
  isManager: boolean;
  onNew: () => void;
  onHourly?: () => void;
  preview?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Compensation")}</h1>
          {preview ? <PreviewBadge /> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? t("Manage pay structures, approve salary changes, and prepare payroll inputs, without running a full tax engine yet.")
            : isManager
              ? t("Review compensation for your direct reports and propose changes for HR approval.")
              : t("Compensation records for your organization.")}
        </p>
      </div>
      {(isAdmin || isManager) && (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {isAdmin && onHourly ? (
            <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={onHourly}>
              <Timer className="h-4 w-4" />
              {t("Set hourly rate")}</Button>
          ) : null}
          <Button size="sm" className="w-full sm:w-auto" onClick={onNew}>
            <Plus className="h-4 w-4" />
            {t("Propose salary change")}</Button>
        </div>
      )}
    </div>
  );
}
