"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaveType } from "@/lib/leave/types";
import { cn } from "@/lib/utils";

export function LeaveTypesManager({
  types,
  onChange,
}: {
  types: LeaveType[];
  onChange: (id: string, patch: Partial<LeaveType>) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Leave types</CardTitle>
        <p className="text-xs text-muted-foreground">
          Each type has its own balance, approval, and attachment rules.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {types.map((t) => (
          <div key={t.id} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.color }} />
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={t.enabled ? "outline" : "secondary"}
                onClick={() => onChange(t.id, { enabled: !t.enabled })}
              >
                {t.enabled ? "On" : "Off"}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Toggle
                label="Tracks balance"
                on={t.tracksBalance}
                onClick={() => onChange(t.id, { tracksBalance: !t.tracksBalance })}
              />
              <Toggle
                label="Approval required"
                on={t.approvalRequired}
                onClick={() => onChange(t.id, { approvalRequired: !t.approvalRequired })}
              />
              <Toggle
                label="Attachment"
                on={t.attachmentRequired}
                onClick={() => onChange(t.id, { attachmentRequired: !t.attachmentRequired })}
              />
              <Toggle
                label="Paid"
                on={t.paid}
                onClick={() => onChange(t.id, { paid: !t.paid })}
              />
              <Toggle
                label="Counts as annual"
                on={t.countsAgainstAnnual}
                onClick={() => onChange(t.id, { countsAgainstAnnual: !t.countsAgainstAnnual })}
              />
              <Toggle
                label="Half-day"
                on={t.allowHalfDay}
                onClick={() => onChange(t.id, { allowHalfDay: !t.allowHalfDay })}
              />
              <Toggle
                label="Emergency"
                on={t.allowEmergency}
                onClick={() => onChange(t.id, { allowEmergency: !t.allowEmergency })}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Toggle({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-2.5 py-1 text-[11px] font-medium ring-1",
        on ? "bg-accent text-accent-foreground ring-primary/20" : "bg-card text-muted-foreground ring-border",
      )}
    >
      {label}
    </button>
  );
}
