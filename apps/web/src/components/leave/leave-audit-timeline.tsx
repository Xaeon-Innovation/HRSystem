import { formatDateTime } from "@/lib/leave/format";
import type { LeaveAuditEvent } from "@/lib/leave/types";
import { t } from "@/i18n";

const ACTION_LABEL: Record<LeaveAuditEvent["action"], string> = {
  created: "Created",
  submitted: "Submitted",
  validated: "Validated",
  approved: "Approved",
  rejected: "Rejected",
  returned: "Returned",
  cancelled: "Cancelled",
  expired: "Expired",
  commented: "Comment",
  attachment_added: "Attachment",
  balance_adjusted: "Balance",
  delegated: "Delegated",
  escalated: "Escalated",
  reminder_sent: "Reminder",
};

export function LeaveAuditTimeline({ events }: { events: LeaveAuditEvent[] }) {
  const rows = [...events].sort((a, b) => b.at.localeCompare(a.at));
  if (rows.length === 0) {
    return <p className="text-sm text-ink-muted">{t("No activity yet.")}</p>;
  }
  return (
    <ol className="space-y-3">
      {rows.map((e) => (
        <li key={e.id} className="relative pl-4 text-sm">
          <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
          <p className="font-medium">
            {t(ACTION_LABEL[e.action])} · {e.actorName}
          </p>
          <p className="text-xs text-ink-muted">{formatDateTime(e.at)}</p>
          {e.note ? <p className="mt-0.5 text-ink-muted">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
