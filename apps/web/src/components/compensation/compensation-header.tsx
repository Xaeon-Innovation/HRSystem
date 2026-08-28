"use client";

import { Plus, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CompensationHeader({
  isAdmin,
  isManager,
  onNew,
  onHourly,
}: {
  isAdmin: boolean;
  isManager: boolean;
  onNew: () => void;
  onHourly?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-tight">Compensation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAdmin
            ? "Manage pay structures, approve salary changes, and prepare payroll inputs — without running a full tax engine yet."
            : isManager
              ? "Review compensation for your direct reports and propose changes for HR approval."
              : "Compensation records for your organization."}
        </p>
      </div>
      {(isAdmin || isManager) && (
        <div className="flex flex-wrap gap-2">
          {isAdmin && onHourly ? (
            <Button size="sm" variant="outline" onClick={onHourly}>
              <Timer className="h-4 w-4" />
              Set hourly rate
            </Button>
          ) : null}
          <Button size="sm" onClick={onNew}>
            <Plus className="h-4 w-4" />
            Propose salary change
          </Button>
        </div>
      )}
    </div>
  );
}
