"use client";

import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Hiring")}</h1>
          {preview ? <PreviewBadge /> : null}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("Open roles, move candidates through the pipeline, run interviews, send offers, and convert hires into employees, without a heavyweight ATS.")}</p>
      </div>
      {canManage ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={onAddCandidate}>
            <UserPlus className="h-4 w-4" />
            {t("Add candidate")}</Button>
          <Button size="sm" className="w-full sm:w-auto" onClick={onNewJob}>
            <Plus className="h-4 w-4" />
            {t("New job opening")}</Button>
        </div>
      ) : null}
    </div>
  );
}
