"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SELECT_CLASS } from "@/lib/kpis/format";
import { ROLE_TEMPLATES } from "@/lib/kpis/templates";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { ApiKpiDefinition, EmployeeOption, RoleTemplateId } from "@/lib/kpis/types";
import { t } from "@/i18n";

export function KpiTemplateDialog({
  open,
  onOpenChange,
  definitions,
  employees,
  selectedEmployeeId,
  assignedPairs,
  onCreate,
  onClone,
  onAssign,
  onUpdate,
  onDelete,
  onUnassign,
  onApplyTemplate,
  onPullActuals,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  definitions: ApiKpiDefinition[];
  employees: EmployeeOption[];
  selectedEmployeeId: string;
  assignedPairs: { kpiId: string; employeeId: string; assignmentId: string }[];
  onCreate: (
    name: string,
    target: number,
    period: string,
    employeeId?: string,
  ) => Promise<void>;
  onClone: (id: string) => Promise<void>;
  onAssign: (kpiId: string, employeeId: string) => Promise<void>;
  onUpdate: (
    id: string,
    data: { name: string; targetValue: number; reviewPeriod: string },
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUnassign: (assignmentId: string) => Promise<void>;
  onApplyTemplate: (role: RoleTemplateId, employeeId: string) => Promise<void>;
  onPullActuals?: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("100");
  const [period, setPeriod] = useState("monthly");
  const [role, setRole] = useState<RoleTemplateId>("sales");
  const [employeeId, setEmployeeId] = useState(selectedEmployeeId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ApiKpiDefinition | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmployeeId(selectedEmployeeId);
  }, [selectedEmployeeId]);

  const template = ROLE_TEMPLATES.find((t) => t.id === role)!;
  const personName = employees.find((e) => e.id === employeeId)?.name;
  const editing = definitions.find((d) => d.id === editingId) ?? null;

  function isAssigned(kpiId: string) {
    if (!employeeId) return false;
    return assignedPairs.some(
      (p) => p.kpiId === kpiId && p.employeeId === employeeId,
    );
  }

  function assignmentIdFor(kpiId: string) {
    if (!employeeId) return null;
    return (
      assignedPairs.find(
        (p) => p.kpiId === kpiId && p.employeeId === employeeId,
      )?.assignmentId ?? null
    );
  }

  function startEdit(kpi: ApiKpiDefinition) {
    setEditingId(kpi.id);
    setName(kpi.name);
    setTarget(String(kpi.targetValue ?? 100));
    setPeriod(kpi.reviewPeriod);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setTarget("100");
    setPeriod("monthly");
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveMetric(e: FormEvent) {
    e.preventDefault();
    await run(async () => {
      if (editingId) {
        await onUpdate(editingId, {
          name,
          targetValue: Number(target),
          reviewPeriod: period,
        });
        cancelEdit();
        return;
      }
      await onCreate(name, Number(target), period, employeeId || undefined);
      setName("");
    });
  }

  async function confirmDelete() {
    const kpi = pendingDelete;
    if (!kpi) return;
    await run(async () => {
      if (editingId === kpi.id) cancelEdit();
      await onDelete(kpi.id);
      setPendingDelete(null);
    });
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("Set up KPIs")}</SheetTitle>
          <SheetDescription>
            {t("Assign a job pack or any custom metric to a person. Edit or delete saved metrics here.")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-6">
          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <section className="space-y-2">
            <Label>{t("Person")}</Label>
            <select
              className={SELECT_CLASS}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              <option value="">{t("Choose who gets the metrics")}</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {employeeId
                ? `Assign and unassign apply to ${personName}.`
                : t("Choose a person to assign. You can still save, edit, or delete a metric without assigning it.")}
            </p>
          </section>

          {onPullActuals ? (
            <section className="space-y-2 rounded-md border px-3 py-3">
              <h3 className="text-sm font-semibold">{t("Attendance actuals")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("For metrics named like Attendance or On-time, fill this month&apos;s score from clock-ins when missing.")}</p>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                disabled={busy}
                onClick={() => run(() => onPullActuals())}
              >
                {t("Pull attendance actuals")}</Button>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">{t("Assign a job pack")}</h3>
            <p className="text-sm text-muted-foreground">{template.summary}</p>
            <div className="grid gap-2">
              <Label>{t("Job type")}</Label>
              <select
                className={SELECT_CLASS}
                value={role}
                onChange={(e) => setRole(e.target.value as RoleTemplateId)}
              >
                {ROLE_TEMPLATES.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {t(tpl.label)}
                  </option>
                ))}
              </select>
            </div>
            <ul className="space-y-1 rounded-md border bg-secondary/40 px-3 py-2 text-xs">
              {template.kpis.map((k) => (
                <li key={k.key} className="flex justify-between gap-2">
                  <span>{t(k.title)}</span>
                  <span className="text-muted-foreground">{t("counts")}{k.weight}%</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => run(() => onApplyTemplate(role, employeeId))}
              disabled={busy || !employeeId}
              className="w-full"
            >
              {busy ? t("Assigning…") : t("Assign this job pack")}
            </Button>
          </section>

          <section>
            <h3 className="text-sm font-semibold">
              {editing ? `Edit “${editing.name}”` : t("Add a custom metric")}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {editing
                ? t("Saving changes updates this metric for everyone who has it.")
                : t("Your own name and target — not limited to the job packs.")}
            </p>
            <form className="mt-3 space-y-3" onSubmit={saveMetric}>
              <div className="space-y-1">
                <Label>{t("Name")}</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder={t("e.g. Training hours")}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>{t("Target")}</Label>
                  <Input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{t("Period")}</Label>
                  <select
                    className={SELECT_CLASS}
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                  >
                    <option value="weekly">{t("Weekly")}</option>
                    <option value="monthly">{t("Monthly")}</option>
                    <option value="quarterly">{t("Quarterly")}</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                {editing ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    disabled={busy}
                    onClick={cancelEdit}
                  >
                    {t("Cancel")}</Button>
                ) : null}
                <Button type="submit" disabled={busy} className="flex-1">
                  {editing
                    ? t("Save changes")
                    : employeeId
                      ? t("Add and assign to this person")
                      : t("Save metric only")}
                </Button>
              </div>
            </form>
          </section>

          <section>
            <h3 className="text-sm font-semibold">{t("Saved metrics")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("Assign, edit, or delete any metric.")}</p>
            <ul className="mt-2 space-y-2">
              {definitions.map((k) => {
                const assigned = isAssigned(k.id);
                const assignmentId = assignmentIdFor(k.id);
                return (
                  <li key={k.id} className="rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <span>
                        {k.name}
                        <span className="block text-[11px] text-muted-foreground">
                          {t("target")}{k.targetValue ?? "—"} · {k.reviewPeriod}
                          {assigned ? t(" · assigned to this person") : ""}
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {assigned && assignmentId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => run(() => onUnassign(assignmentId))}
                        >
                          {t("Unassign")}</Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={busy || !employeeId}
                          onClick={() => run(() => onAssign(k.id, employeeId))}
                        >
                          {t("Assign")}</Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => startEdit(k)}
                      >
                        {t("Edit")}</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => run(() => onClone(k.id))}
                      >
                        {t("Clone")}</Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => setPendingDelete(k)}
                      >
                        {t("Delete")}</Button>
                    </div>
                  </li>
                );
              })}
              {definitions.length === 0 ? (
                <li className="text-sm text-muted-foreground">{t("None yet.")}</li>
              ) : null}
            </ul>
          </section>
        </SheetBody>
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete ? `Delete “${pendingDelete.name}”?` : "Delete metric?"}
        description="This removes it for everyone and deletes recorded results."
        confirmLabel="Delete"
        variant="destructive"
        busy={busy}
        onConfirm={confirmDelete}
        onOpenChange={(next) => {
          if (!next && !busy) setPendingDelete(null);
        }}
      />
    </>
  );
}
