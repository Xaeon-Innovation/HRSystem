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
import type { LeaveActor, LeaveRequest } from "@/lib/leave/types";

export function LeaveRequestDetailDrawer({
  request,
  open,
  onOpenChange,
  isAdmin,
  actor,
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
  const canDecide = Boolean(request && request.status === "pending" && isAdmin);
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
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium">
                  {urgencyLabel(request.urgency)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {partialDayLabel(request.partialDayType)}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Fact label="Days" value={formatDays(request.requestedDays)} />
                <Fact label="Submitted" value={formatDateTime(request.submittedAt)} />
                <Fact label="Department" value={`${request.department} · ${request.branchName}`} />
                <Fact label="Manager" value={request.managerName ?? "—"} />
                <Fact label="Approver" value={request.approverName ?? "—"} />
                <Fact label="Decision" value={formatDateTime(request.decisionDate)} />
              </dl>

              {request.rejectionReason ? (
                <Section title="Rejection reason">
                  <p className="text-sm">{request.rejectionReason}</p>
                </Section>
              ) : null}

              <Section title="Employee note">
                <p className="text-sm">{request.reason || "No note"}</p>
              </Section>

              <Section title="Handover / coverage">
                <p className="text-sm">{request.handoverNotes || "None recorded"}</p>
                {request.coverageEmployeeName ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Coverage: {request.coverageEmployeeName}
                  </p>
                ) : null}
              </Section>

              {request.attachmentName ? (
                <Section title="Attachment">
                  <p className="text-sm">{request.attachmentName}</p>
                </Section>
              ) : null}

              {request.conflicts.length > 0 ? (
                <Section title="Policy checks">
                  <LeaveConflictWarnings conflicts={request.conflicts} />
                </Section>
              ) : null}

              <Section title="Approval steps">
                {request.approvalSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No approval chain — auto-handled.</p>
                ) : (
                  <ol className="space-y-2">
                    {request.approvalSteps.map((s) => (
                      <li key={s.id} className="rounded-md border px-3 py-2 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">
                            Step {s.level} · {s.assigneeName}
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
                        <p className="text-xs capitalize text-muted-foreground">{s.role}</p>
                        {s.backupName ? (
                          <p className="text-xs text-muted-foreground">Backup: {s.backupName}</p>
                        ) : null}
                        {s.comment ? <p className="mt-1 text-sm">{s.comment}</p> : null}
                      </li>
                    ))}
                  </ol>
                )}
              </Section>

              <Section title="Comments">
                {request.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {request.comments.map((c) => (
                      <li key={c.id} className="rounded-md border px-3 py-2 text-sm">
                        <p className="text-xs text-muted-foreground">
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
                  placeholder={isAdmin ? "Approver note" : "Add a note"}
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
                  Add comment
                </Button>
              </Section>

              {isAdmin ? (
                <Section title="Internal HR note">
                  <textarea
                    className={TEXTAREA_CLASS}
                    value={hrNote}
                    onChange={(e) => setHrNote(e.target.value)}
                    placeholder="Visible only to people ops"
                  />
                  <Button
                    size="sm"
                    className="mt-2"
                    variant="outline"
                    onClick={() => onHrNote(request.id, hrNote)}
                  >
                    Save HR note
                  </Button>
                </Section>
              ) : null}

              <Section title="Audit trail">
                <LeaveAuditTimeline events={request.audit} />
              </Section>

              {error ? <p className="text-sm text-destructive">{error}</p> : null}

              <div className="flex flex-wrap gap-2 border-t pt-4">
                {canEdit ? (
                  <Button size="sm" onClick={() => onEdit(request.id)}>
                    Continue editing
                  </Button>
                ) : null}
                {canDecide ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onApprove(request.id, comment || "Approved")}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!comment.trim()) {
                          setError("A written reason is required to reject.");
                          return;
                        }
                        onReject(request.id, comment.trim());
                      }}
                    >
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (!comment.trim()) {
                          setError("Tell the employee what to change.");
                          return;
                        }
                        onReturn(request.id, comment.trim());
                      }}
                    >
                      Return for edits
                    </Button>
                  </>
                ) : null}
                {canCancel ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onCancel(request.id, comment || "Cancelled")}
                  >
                    Cancel request
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
    <div className="rounded-md bg-secondary/50 px-3 py-2">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}
