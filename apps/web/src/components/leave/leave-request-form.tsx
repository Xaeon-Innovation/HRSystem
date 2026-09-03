"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LeaveConflictWarnings } from "@/components/leave/leave-conflict-warnings";
import { formatDays, SELECT_CLASS, TEXTAREA_CLASS } from "@/lib/leave/format";
import { hasBlockingConflicts } from "@/lib/leave/conflicts";
import { cn } from "@/lib/utils";
import type { LeaveStore } from "@/lib/leave/store";
import type { LeaveActor, LeaveRequest, LeaveRequestDraft, LeaveType } from "@/lib/leave/types";
import { PARTIAL_DAY_TYPES, type PartialDayType } from "@/lib/leave/types";

type FormState = Omit<LeaveRequestDraft, "asDraft">;

export function LeaveRequestForm({
  open,
  onOpenChange,
  store,
  actor,
  isAdmin,
  editing,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: LeaveStore;
  actor: LeaveActor;
  isAdmin: boolean;
  editing?: LeaveRequest | null;
  onSubmitted: () => void;
}) {
  const employees = store.employees();
  const types = store.types().filter((t) => t.enabled);
  const defaultEmployeeId =
    actor.role === "employee"
      ? actor.employeeId ?? employees[0]?.id ?? ""
      : editing?.employeeId ?? employees[0]?.id ?? "";

  const [form, setForm] = useState<FormState>(() => initialForm(defaultEmployeeId, types, editing));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const employee = store.employee(form.employeeId);
  const leaveType = store.typeById(form.leaveTypeId);
  const draft: LeaveRequestDraft = { ...form, asDraft: false };
  const preview = useMemo(
    () => (form.employeeId && form.leaveTypeId ? store.preview(draft) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      form.employeeId,
      form.leaveTypeId,
      form.startDate,
      form.endDate,
      form.requestedDays,
      form.partialDayType,
      form.customHours,
      form.urgency,
      form.attachmentName,
      store,
    ],
  );

  const days = preview?.days ?? 0;
  const effectiveDays = form.requestedDays ?? days;

  function patch(p: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...p }));
    setError(null);
  }

  function submit(asDraft: boolean) {
    if (!employee || !leaveType) return;
    setBusy(true);
    setError(null);
    try {
      const payload: LeaveRequestDraft = {
        ...form,
        employeeId: isAdmin ? form.employeeId : actor.employeeId ?? form.employeeId,
        requestedDays: effectiveDays,
        asDraft,
      };
      if (editing && (editing.status === "draft" || editing.status === "returned")) {
        store.resubmit(editing.id, payload, actor);
      } else {
        store.submit(payload, actor);
      }
      onSubmitted();
      onOpenChange(false);
      setForm(initialForm(defaultEmployeeId, types, null));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this request.");
    } finally {
      setBusy(false);
    }
  }

  const blocked = preview ? hasBlockingConflicts(preview.conflicts) : true;
  const singleDay = form.startDate === form.endDate;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-xl">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit leave request" : "New leave request"}</SheetTitle>
          <SheetDescription>
            Dates, days, and remaining balance are checked before anything is sent for approval.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {isAdmin ? (
            <Field label="Employee">
              <select
                className={SELECT_CLASS}
                value={form.employeeId}
                onChange={(e) => patch({ employeeId: e.target.value })}
              >
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} · {e.department}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field label="Leave type">
            <select
              className={SELECT_CLASS}
              value={form.leaveTypeId}
              onChange={(e) => patch({ leaveTypeId: e.target.value })}
            >
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.paid ? "" : " (unpaid)"}
                </option>
              ))}
            </select>
          </Field>

          {leaveType ? (
            <p className="text-xs text-muted-foreground">{leaveType.description}</p>
          ) : null}

          <div className="grid grid-cols-2 gap-3">
            <Field label="Start">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  patch({
                    startDate: e.target.value,
                    endDate: form.endDate < e.target.value ? e.target.value : form.endDate,
                    requestedDays: null,
                  })
                }
              />
            </Field>
            <Field label="End">
              <Input
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => patch({ endDate: e.target.value, requestedDays: null })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Days off">
              <Input
                type="number"
                min={0.5}
                step={0.5}
                value={effectiveDays}
                onChange={(e) => patch({ requestedDays: Number(e.target.value) })}
              />
            </Field>
            <Field label="Day length">
              <select
                className={SELECT_CLASS}
                value={form.partialDayType}
                disabled={!singleDay}
                onChange={(e) => patch({ partialDayType: e.target.value as PartialDayType })}
              >
                {PARTIAL_DAY_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p === "full"
                      ? "Full day"
                      : p === "first_half"
                        ? "Morning half-day"
                        : p === "second_half"
                          ? "Afternoon half-day"
                          : "Custom hours"}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {form.partialDayType === "custom_hours" ? (
            <Field label="Hours">
              <Input
                type="number"
                min={1}
                max={8}
                step={0.5}
                value={form.customHours ?? 4}
                onChange={(e) => patch({ customHours: Number(e.target.value), requestedDays: null })}
              />
            </Field>
          ) : null}

          <fieldset className="space-y-2">
            <legend className="text-xs text-muted-foreground">Urgency</legend>
            <div className="flex gap-2">
              {(["planned", "emergency"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => patch({ urgency: u })}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium ring-1",
                    form.urgency === u
                      ? "bg-primary text-primary-foreground ring-primary"
                      : "bg-card text-muted-foreground ring-border hover:bg-secondary",
                  )}
                >
                  {u === "planned" ? "Planned" : "Emergency"}
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="Reason / notes">
            <textarea
              className={TEXTAREA_CLASS}
              value={form.reason}
              onChange={(e) => patch({ reason: e.target.value })}
              placeholder="Why you need this time off"
            />
          </Field>

          <Field label="Handover / coverage">
            <textarea
              className={TEXTAREA_CLASS}
              value={form.handoverNotes}
              onChange={(e) => patch({ handoverNotes: e.target.value })}
              placeholder="Who covers your work, and what they need"
            />
          </Field>

          <Field label="Coverage person (optional)">
            <select
              className={SELECT_CLASS}
              value={form.coverageEmployeeId ?? ""}
              onChange={(e) => patch({ coverageEmployeeId: e.target.value || null })}
            >
              <option value="">None selected</option>
              {employees
                .filter((e) => e.id !== form.employeeId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label={leaveType?.attachmentRequired ? "Attachment (required)" : "Attachment (optional)"}>
            <Input
              type="file"
              onChange={(e) => patch({ attachmentName: e.target.files?.[0]?.name ?? null })}
            />
            {form.attachmentName ? (
              <p className="mt-1 text-xs text-muted-foreground">{form.attachmentName}</p>
            ) : null}
          </Field>

          {preview?.balance && leaveType?.tracksBalance ? (
            <div className="rounded-lg border bg-secondary/40 px-3 py-2 text-sm">
              <p className="font-medium">Balance before you submit</p>
              <p className="mt-1 tabular-nums text-muted-foreground">
                Remaining {formatDays(preview.balance.remaining)} · pending {formatDays(preview.balance.pending)} ·
                available {formatDays(preview.available)} · this request {formatDays(effectiveDays)}
              </p>
            </div>
          ) : null}

          {preview ? <LeaveConflictWarnings conflicts={preview.conflicts} /> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => submit(true)}>
              Save draft
            </Button>
            <Button type="button" disabled={busy || blocked} onClick={() => submit(false)}>
              {leaveType && !leaveType.approvalRequired ? "Submit" : "Submit for approval"}
            </Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function initialForm(
  employeeId: string,
  types: LeaveType[],
  editing?: LeaveRequest | null,
): FormState {
  if (editing) {
    return {
      employeeId: editing.employeeId,
      leaveTypeId: editing.leaveTypeId,
      startDate: editing.startDate,
      endDate: editing.endDate,
      requestedDays: editing.requestedDays,
      partialDayType: editing.partialDayType,
      customHours: editing.customHours,
      urgency: editing.urgency,
      reason: editing.reason,
      handoverNotes: editing.handoverNotes,
      coverageEmployeeId: editing.coverageEmployeeId,
      attachmentName: editing.attachmentName,
    };
  }
  return {
    employeeId,
    leaveTypeId: types[0]?.id ?? "",
    startDate: "",
    endDate: "",
    requestedDays: null,
    partialDayType: "full",
    customHours: null,
    urgency: "planned",
    reason: "",
    handoverNotes: "",
    coverageEmployeeId: null,
    attachmentName: null,
  };
}
