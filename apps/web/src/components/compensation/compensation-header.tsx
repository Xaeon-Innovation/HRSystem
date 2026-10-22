"use client";

import { Plus, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/elevora";
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
    <PageHeader
      title={t("Compensation")}
      breadcrumbs={preview ? <PreviewBadge /> : undefined}
      subtitle={
        isAdmin
          ? t("Manage pay structures, approve salary changes, and prepare payroll inputs, without running a full tax engine yet.")
          : isManager
            ? t("Review compensation for your direct reports and propose changes for HR approval.")
            : t("Compensation records for your organization.")
      }
      actions={
        isAdmin || isManager ? (
          <>
            {isAdmin && onHourly ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={onHourly}
              >
                <Timer className="h-4 w-4" />
                {t("Set hourly rate")}
              </Button>
            ) : null}
            <Button size="sm" className="w-full sm:w-auto" onClick={onNew}>
              <Plus className="h-4 w-4" />
              {t("Propose salary change")}
            </Button>
          </>
        ) : undefined
      }
    />
  );
}
