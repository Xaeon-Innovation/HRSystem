"use client";

import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/elevora";
import { PreviewBadge } from "@/components/ui/preview-badge";
import { t } from "@/i18n";

export function HiringHeader({
  canManage,
  onNewJob,
  onAddCandidate,
  preview = false,
}: {
  canManage: boolean;
  onNewJob: () => void;
  onAddCandidate: () => void;
  preview?: boolean;
}) {
  return (
    <PageHeader
      title={t("Hiring")}
      subtitle={t(
        "Open roles, move candidates through the pipeline, run interviews, send offers, and convert hires into employees, without a heavyweight ATS.",
      )}
      actions={
        <>
          {preview ? <PreviewBadge /> : null}
          {canManage ? (
            <>
              <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={onAddCandidate}>
                <UserPlus className="h-4 w-4" />
                {t("Add candidate")}
              </Button>
              <Button size="sm" className="w-full sm:w-auto" onClick={onNewJob}>
                <Plus className="h-4 w-4" />
                {t("New job opening")}
              </Button>
            </>
          ) : null}
        </>
      }
    />
  );
}
