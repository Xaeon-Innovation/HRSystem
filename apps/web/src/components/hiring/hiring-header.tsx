"use client";

import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function HiringHeader({
  canManage,
  onNewJob,
  onAddCandidate,
}: {
  canManage: boolean;
  onNewJob: () => void;
  onAddCandidate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Hiring</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open roles, move candidates through the pipeline, run interviews, send offers, and
          convert hires into employees — without a heavyweight ATS.
        </p>
      </div>
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onAddCandidate}>
            <UserPlus className="h-4 w-4" />
            Add candidate
          </Button>
          <Button size="sm" onClick={onNewJob}>
            <Plus className="h-4 w-4" />
            New job opening
          </Button>
        </div>
      ) : null}
    </div>
  );
}
