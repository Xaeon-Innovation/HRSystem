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
import type {
  LeaveActor,
  LeaveAttachment,
  LeaveRequest,
  LeaveRequestDraft,
  LeaveType,
} from "@/lib/leave/types";
import { PARTIAL_DAY_TYPES, type PartialDayType } from "@/lib/leave/types";
import { t } from "@/i18n";

type FormState = Omit<LeaveRequestDraft, "asDraft">;

const MAX_ATTACHMENT_BYTES = Math.floor(1.5 * 1024 * 1024);
const MAX_ATTACHMENTS = 3;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read file"));
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function LeaveRequestForm({
  open,
  onOpenChange,
  store,
  actor,
  isAdmin,
  editing,
  busy,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: LeaveStore;
  actor: LeaveActor;
  isAdmin: boolean;
  editing?: LeaveRequest | null;
  busy?: boolean;
  onSave: (draft: LeaveRequestDraft, editingId: string | null) => Promise<void>;
}) {
  const employees = store.employees();
  const types = store.types().filter((t) => t.enabled);
  const defaultEmployeeId =
    actor.role === "employee"
      ? actor.employeeId ?? employees[0]?.id ?? ""
      : editing?.employeeId ?? employees[0]?.id ?? "";

  const [form, setForm] = useState<FormState>(() => initialForm(defaultEmployeeId, types, editing));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      form.attachments,
      store,
    ],
  );

  const days = preview?.days ?? 0;
  const effectiveDays = form.requestedDays ?? days;
  const attachments = form.attachments ?? [];

  function patch(p: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...p }));
    setError(null);
  }

  async function onPickFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setError(`You can attach up to ${MAX_ATTACHMENTS} files.`);
      return;
    }
    const picked = Array.from(fileList).slice(0, room);
    const next: LeaveAttachment[] = [...attachments];
    for (const file of picked) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`“${file.name}” is larger than 1.5MB.`);
        continue;
      }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        next.push({
          id: `att-${crypto.randomUUID()}`,
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read file.");
      }
    }
    patch({
      attachments: next,
      attachmentName: next[0]?.name ?? null,
    });
  }

  function removeAttachment(id: string) {
    const next = attachments.filter((a) => a.id !== id);
    patch({
      attachments: next,
      attachmentName: next[0]?.name ?? null,
    });
  }

  function submit(asDraft: boolean) {
    if (!employee || !leaveType) return;
    if (actor.role === "employee" && !actor.employeeId) {
      setError("Your account is missing an employee profile, so leave cannot be filed yet.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload: LeaveRequestDraft = {
      ...form,
      employeeId: isAdmin ? form.employeeId : actor.employeeId ?? form.employeeId,
      requestedDays: effectiveDays,
      attachments,
      attachmentName: attachments[0]?.name ?? form.attachmentName,
      asDraft,
    };
    void (async () => {
      try {
        await onSave(
          payload,
          editing && (editing.status === "draft" || editing.status === "returned")
            ? editing.id
            : null,
        );
        onOpenChange(false);
        setForm(initialForm(defaultEmployeeId, types, null));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save this request.");
      } finally {
        setSaving(false);
      }
    })();
  }

  const blocked = preview ? hasBlockingConflicts(preview.conflicts) : true;
  const singleDay = form.startDate === form.endDate;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-xl">
        <SheetHeader>
          <SheetTitle>{editing ? t("Edit leave request") : t("New leave request")}</SheetTitle>
          <SheetDescription>
            {t("Dates, days, and remaining balance are checked before anything is sent for approval.")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {isAdmin ? (
            <Field label={t("Employee")}>
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
              {types.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                  {lt.paid ? "" : t(" (unpaid)")}
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
                      ? t("Full day")
                      : p === "first_half"
                        ? t("Morning half-day")
                        : p === "second_half"
                          ? t("Afternoon half-day")
                          : t("Custom hours")}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {form.partialDayType === "custom_hours" ? (
            <Field label={t("Hours")}>
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
            <legend className="text-xs text-muted-foreground">{t("Urgency")}</legend>
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
                  {u === "planned" ? t("Planned") : t("Emergency")}
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="Reason / notes">
            <textarea
              className={TEXTAREA_CLASS}
              value={form.reason}
              onChange={(e) => patch({ reason: e.target.value })}
              placeholder={t("Why you need this time off")}
            />
          </Field>

          <Field label="Handover / coverage">
            <textarea
              className={TEXTAREA_CLASS}
              value={form.handoverNotes}
              onChange={(e) => patch({ handoverNotes: e.target.value })}
              placeholder={t("Who covers your work, and what they need")}
            />
          </Field>

          <Field label="Coverage person (optional)">
            <select
              className={SELECT_CLASS}
              value={form.coverageEmployeeId ?? ""}
              onChange={(e) => patch({ coverageEmployeeId: e.target.value || null })}
            >
              <option value="">{t("None selected")}</option>
              {employees
                .filter((e) => e.id !== form.employeeId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </Field>

          <Field label={leaveType?.attachmentRequired ? "Attachments (required)" : "Attachments (optional)"}>
            <Input
              type="file"
              multiple
              disabled={attachments.length >= MAX_ATTACHMENTS}
              onChange={(e) => {
                void onPickFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {t("Up to")}{MAX_ATTACHMENTS} {t("files, 1.5MB each.")}</p>
            {attachments.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {attachments.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-2 py-1.5 text-xs"
                  >
                    <span className="min-w-0 truncate">{a.name}</span>
                    <button
                      type="button"
                      className="shrink-0 text-destructive underline"
                      onClick={() => removeAttachment(a.id)}
                    >
                      {t("Remove")}</button>
                  </li>
                ))}
              </ul>
            ) : null}
          </Field>

          {preview?.balance && leaveType?.tracksBalance ? (
            <div className="rounded-lg border bg-secondary/40 px-3 py-2 text-sm">
              <p className="font-medium">{t("Balance before you submit")}</p>
              <p className="mt-1 tabular-nums text-muted-foreground">
                {t("Remaining")}{formatDays(preview.balance.remaining)} {t("· pending")}{formatDays(preview.balance.pending)} {t("· available")}{formatDays(preview.available)} {t("· this request")}{formatDays(effectiveDays)}
              </p>
            </div>
          ) : null}

          {preview ? <LeaveConflictWarnings conflicts={preview.conflicts} /> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button type="button" variant="outline" disabled={saving || busy} onClick={() => submit(true)}>
              {t("Save draft")}</Button>
            <Button type="button" disabled={saving || busy || blocked} onClick={() => submit(false)}>
              {leaveType && !leaveType.approvalRequired ? t("Submit") : t("Submit for approval")}
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
    const attachments = editing.attachments ?? [];
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
      attachmentName: attachments[0]?.name ?? editing.attachmentName,
      attachments,
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
    attachments: [],
  };
}
