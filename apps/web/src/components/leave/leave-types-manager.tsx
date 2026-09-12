"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeaveType } from "@/lib/leave/types";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

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
        <CardTitle className="text-base">{t("Leave types")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {t("Each type has its own balance, approval, and attachment rules.")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {types.map((lt) => (
          <div key={lt.id} className="rounded-xl border p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: lt.color }} />
                <div>
                  <p className="font-medium">{lt.name}</p>
                  <p className="text-xs text-muted-foreground">{lt.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={lt.enabled ? "outline" : "secondary"}
                onClick={() => onChange(lt.id, { enabled: !lt.enabled })}
              >
                {lt.enabled ? t("On") : t("Off")}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Toggle
                label={t("Tracks balance")}
                on={lt.tracksBalance}
                onClick={() => onChange(lt.id, { tracksBalance: !lt.tracksBalance })}
              />
              <Toggle
                label={t("Approval required")}
                on={lt.approvalRequired}
                onClick={() => onChange(lt.id, { approvalRequired: !lt.approvalRequired })}
              />
              <Toggle
                label={t("Attachment")}
                on={lt.attachmentRequired}
                onClick={() => onChange(lt.id, { attachmentRequired: !lt.attachmentRequired })}
              />
              <Toggle
                label={t("Paid")}
                on={lt.paid}
                onClick={() => onChange(lt.id, { paid: !lt.paid })}
              />
              <Toggle
                label={t("Counts as annual")}
                on={lt.countsAgainstAnnual}
                onClick={() => onChange(lt.id, { countsAgainstAnnual: !lt.countsAgainstAnnual })}
              />
              <Toggle
                label={t("Half-day")}
                on={lt.allowHalfDay}
                onClick={() => onChange(lt.id, { allowHalfDay: !lt.allowHalfDay })}
              />
              <Toggle
                label={t("Emergency")}
                on={lt.allowEmergency}
                onClick={() => onChange(lt.id, { allowEmergency: !lt.allowEmergency })}
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
