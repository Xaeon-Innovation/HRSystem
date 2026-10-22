import { Timeline } from "@/components/elevora";
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
    return <p className="text-sm text-ink-muted">{t("No activity yet.")}</p>;
  }
  return (
    <Timeline
      items={rows.map((e) => ({
        id: e.id,
        tone:
          e.action === "rejected"
            ? "danger"
            : e.action === "returned"
              ? "warn"
              : "accent",
        title: `${ACTION_LABEL[e.action]} · ${e.actorName}`,
        meta: (
          <span>
            {formatDateTime(e.at)}
            {e.oldValue || e.newValue
              ? ` · ${e.oldValue ?? "-"} → ${e.newValue ?? "-"}`
              : ""}
            {e.note ? ` · ${e.note}` : ""}
          </span>
        ),
      }))}
    />
  );
}
