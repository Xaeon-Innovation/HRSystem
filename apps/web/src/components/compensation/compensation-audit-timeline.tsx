import { formatDateTime } from "@/lib/compensation/format";
import type { CompAuditEvent } from "@/lib/compensation/types";
import { t } from "@/i18n";

const ACTION_LABEL: Record<CompAuditEvent["action"], string> = {
  created: "Created",
  updated: "Updated",
  submitted: "Submitted",
  approved: "Approved",
  rejected: "Rejected",
  returned: "Returned",
  frozen: "Frozen",
  unfrozen: "Unfrozen",
  component_added: t("Component added"),
  component_ended: t("Component ended"),
  variable_submitted: t("Variable pay submitted"),
  variable_approved: t("Variable pay approved"),
  commented: "Comment",
};

export function CompensationAuditTimeline({ events }: { events: CompAuditEvent[] }) {
  const rows = [...events].sort((a, b) => b.at.localeCompare(a.at));
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("No activity yet.")}</p>;
  }
  return (
    <ol className="space-y-3">
      {rows.map((e) => (
        <li key={e.id} className="relative pl-4 text-sm">
          <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
          <p className="font-medium">
            {ACTION_LABEL[e.action]} · {e.actorName}
          </p>
          <p className="text-xs text-muted-foreground">{formatDateTime(e.at)}</p>
          {e.oldValue || e.newValue ? (
            <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
              {e.oldValue ?? "-"} → {e.newValue ?? "-"}
            </p>
          ) : null}
          {e.note ? <p className="mt-0.5 text-muted-foreground">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
