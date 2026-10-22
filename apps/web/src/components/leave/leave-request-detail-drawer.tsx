"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LeaveAuditTimeline } from "@/components/leave/leave-audit-timeline";
import { LeaveConflictWarnings } from "@/components/leave/leave-conflict-warnings";
import { LeaveStatusBadge } from "@/components/leave/leave-status-badge";
import { formatDate, formatDateTime, formatDays, partialDayLabel, TEXTAREA_CLASS, urgencyLabel } from "@/lib/leave/format";
import { actorCanActOnStep, currentApprovalStep } from "@/lib/leave/workflow";
import type { LeaveActor, LeaveRequest } from "@/lib/leave/types";
import { t } from "@/i18n";

export function LeaveRequestDetailDrawer({
  request,
  open,
  onOpenChange,
  isAdmin,
  actor,
  balanceRemaining,
  balancePending,
  onApprove,
  onReject,
  onReturn,
  onCancel,
  onComment,
  onHrNote,
  onEdit,
}: {
  request: LeaveRequest | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  actor: LeaveActor;
  balanceRemaining?: number | null;
  balancePending?: number | null;
  onApprove: (id: string, comment: string) => void;
  onReject: (id: string, reason: string) => void;
  onReturn: (id: string, comment: string) => void;
  onCancel: (id: string, note: string) => void;
  onComment: (id: string, body: string) => void;
  onHrNote: (id: string, note: string) => void;
  onEdit: (id: string) => void;
}) {
  const [comment, setComment] = useState("");
  const [hrNote, setHrNote] = useState(request?.internalHrNote ?? "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setHrNote(request?.internalHrNote ?? "");
    setComment("");
    setError(null);
  }, [request?.id, request?.internalHrNote]);

  const own = request && (actor.employeeId === request.employeeId || actor.id === request.employeeId);
  const canDecide = Boolean(
    request &&
      request.status === "pending" &&
      (isAdmin || actorCanActOnStep(actor, currentApprovalStep(request))),
  );
  const canEdit = Boolean(
    request && own && (request.status === "draft" || request.status === "returned"),
  );
  const canCancel = Boolean(
    request &&
      (isAdmin || own) &&
      (request.status === "pending" || request.status === "approved" || request.status === "draft"),
  );

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        setError(null);
      }}
    >
      <SheetContent className="max-w-xl">
        {request ? (
          <>
            <SheetHeader>
              <SheetTitle>{request.employeeName}</SheetTitle>
              <SheetDescription>
                {request.leaveTypeName} · {formatDate(request.startDate)}
                {request.startDate !== request.endDate ? ` – ${formatDate(request.endDate)}` : ""}
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <LeaveStatusBadge status={request.status} />
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-ink">
                  {urgencyLabel(request.urgency)}
                </span>
                <span className="text-xs text-ink-muted">
                  {partialDayLabel(request.partialDayType)}
                </span>
              </div>

              {request.conflicts.length > 0 ? (
                <LeaveConflictWarnings conflicts={request.conflicts} />
              ) : null}

              <div className="grid grid-cols-3 gap-2">
                <Fact
                  label={t("Balance")}
                  value={
                    balanceRemaining == null ? "—" : formatDays(balanceRemaining)
                  }
                />
                <Fact
                  label={t("After")}
                  value={
                    balanceRemaining == null
                      ? "—"
                      : formatDays(
                          Math.max(0, balanceRemaining - request.requestedDays),
                        )
                  }
                />
                <Fact
                  label={t("Pending")}
                  value={
                    balancePending == null ? "—" : formatDays(balancePending)
                  }
                />
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Fact label={t("Days")} value={formatDays(request.requestedDays)} />
                <Fact label={t("Submitted")} value={formatDateTime(request.submittedAt)} />
                <Fact label={t("Department")} value={`${request.department} · ${request.branchName}`} />
                <Fact label={t("Manager")} value={request.managerName ?? "-"} />
              </dl>

              {request.rejectionReason ? (
                <Section title={t("Rejection reason")}>
                  <p className="text-sm">{request.rejectionReason}</p>
                </Section>
              ) : null}

              <Section title={t("Employee note")}>
                <p className="text-sm">{request.reason || t("No note")}</p>
              </Section>

              <Section title={t("Handover / coverage")}>
                <p className="text-sm">{request.handoverNotes || t("None recorded")}</p>
                {request.coverageEmployeeName ? (
                  <p className="mt-1 text-xs text-ink-muted">
                    {t("Coverage:")}{request.coverageEmployeeName}
                  </p>
                ) : null}
              </Section>

              {request.attachments?.length || request.attachmentName ? (
                <Section title={t("Attachment")}>
                  <ul className="space-y-2">
                    {(request.attachments?.length
                      ? request.attachments
                      : [
                          {
                            id: "legacy",
                            name: request.attachmentName ?? t("Attachment"),
                            dataUrl: request.attachmentUrl,
                          },
                        ]
                    ).map((att) => (
                      <li key={att.id} className="text-sm">
                        {att.dataUrl && att.dataUrl !== "#" ? (
                          <a
                            download={att.name}
                            href={att.dataUrl}
                            className="font-medium text-primary underline underline-offset-2"
                          >
                            {t("Download")}{att.name}
                          </a>
                        ) : (
                          <span>{att.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}

              <Section title={t("Approval steps")}>
                {request.approvalSteps.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t("No approval chain, auto-handled.")}</p>
                ) : (
                  <ol className="space-y-2">
                    {request.approvalSteps.map((s) => (
                      <li key={s.id} className="rounded-md border px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">
                            {t("Step")}{s.level} · {s.assigneeName}
                          </p>
                          <LeaveStatusBadge
                            status={
                              s.status === "approved"
                                ? "approved"
                                : s.status === "rejected"
                                  ? "rejected"
                                  : s.status === "pending"
                                    ? "pending"
                                    : "draft"
                            }
                          />
                        </div>
                        <p className="text-xs capitalize text-ink-muted">{s.role}</p>
                        {s.backupName ? (
                          <p className="text-xs text-ink-muted">{t("Backup:")}{s.backupName}</p>
                        ) : null}
                        {s.comment ? <p className="mt-1 text-sm">{s.comment}</p> : null}
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              <Section title={t("Comments")}>
                {request.comments.length === 0 ? (
                  <p className="text-sm text-ink-muted">{t("No comments yet.")}</p>
                ) : (
                  <ul className="space-y-2">
                    {request.comments.map((c) => (
                      <li key={c.id} className="rounded-md border px-3 py-2 text-sm">
                        <p className="text-xs text-ink-muted">
                          {c.authorName} · {c.kind.replace("_", " ")} · {formatDateTime(c.createdAt)}
                        </p>
                        <p className="mt-1">{c.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
                <textarea
                  className={`${TEXTAREA_CLASS} mt-2`}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={isAdmin ? t("Approver note") : t("Add a note")}
                />
                <Button
                  size="sm"
                  className="mt-2"
                  variant="outline"
                  disabled={!comment.trim()}
                  onClick={() => {
                    onComment(request.id, comment.trim());
                    setComment("");
                  }}
                >
                  {t("Add comment")}</Button>
              </Section>

              {isAdmin ? (
                <Section title={t("Internal HR note")}>
                  <textarea
                    className={TEXTAREA_CLASS}
                    value={hrNote}
                    onChange={(e) => setHrNote(e.target.value)}
                    placeholder={t("Visible only to people ops")}
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    variant="outline"
                    onClick={() => onHrNote(request.id, hrNote)}
                  >
                    {t("Save HR note")}</Button>
                </Section>
              ) : null}

              <Section title={t("Audit trail")}>
                <LeaveAuditTimeline events={request.audit} />
              </Section>

              {error ? <p className="text-sm text-danger">{error}</p> : null}

              {canDecide ? (
                <div className="space-y-1">
                  <Label className="text-xs text-ink-muted">{t("Decision note")}</Label>
                  <textarea
                    className={TEXTAREA_CLASS}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={t("Optional note to the employee")}
                  />
                </div>
              ) : null}

              <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:flex-wrap">
                {canEdit ? (
                  <Button size="sm" className="w-full sm:w-auto" onClick={() => onEdit(request.id)}>
                    {t("Continue editing")}
                  </Button>
                ) : null}
                {canDecide ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        if (!comment.trim()) {
                          setError(t("Tell the employee what to change."));
                          return;
                        }
                        onReturn(request.id, comment.trim());
                      }}
                    >
                      {t("Return")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        if (!comment.trim()) {
                          setError(t("A written reason is required to reject."));
                          return;
                        }
                        onReject(request.id, comment.trim());
                      }}
                    >
                      {t("Reject")}
                    </Button>
                    <Button
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => onApprove(request.id, comment || t("Approved"))}
                    >
                      {t("Approve")}
                    </Button>
                  </>
                ) : null}
                {canCancel ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full sm:w-auto"
                    onClick={() => onCancel(request.id, comment || t("Cancelled"))}
                  >
                    {t("Cancel request")}
                  </Button>
                ) : null}
              </div>
            </SheetBody>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] bg-surface-2 px-3 py-2.5">
      <dt className="text-[11px] text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {title}
      </h3>
      {children}
    </section>
  );
}
