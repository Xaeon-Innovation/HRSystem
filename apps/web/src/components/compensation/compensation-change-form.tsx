"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CHANGE_TYPES,
  type ChangeRequestDraft,
  type ChangeType,
  type CompActor,
  type CompEmployee,
  type CompProfile,
} from "@/lib/compensation/types";
import {
  changeTypeLabel,
  formatMoney,
  SELECT_CLASS,
  TEXTAREA_CLASS,
} from "@/lib/compensation/format";
import type { CompensationStore } from "@/lib/compensation/store";
import { t } from "@/i18n";

export function CompensationChangeForm({
  open,
  onOpenChange,
  store,
  actor,
  employees,
  presetEmployeeId,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: CompensationStore;
  actor: CompActor;
  employees: CompEmployee[];
  presetEmployeeId?: string | null;
  onSubmitted: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(presetEmployeeId ?? employees[0]?.id ?? "");
  const [changeType, setChangeType] = useState<ChangeType>("merit_increase");
  const [newAmount, setNewAmount] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [reason, setReason] = useState("");
  const [justification, setJustification] = useState("");
  const [reviewCycle, setReviewCycle] = useState("");
  const [linkPerf, setLinkPerf] = useState(true);
  const [asDraft, setAsDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profile: CompProfile | null = employeeId ? store.profile(employeeId) : null;

  useEffect(() => {
    if (open) {
      const id = presetEmployeeId ?? employees[0]?.id ?? "";
      setEmployeeId(id);
      const rec = id ? store.record(id) : null;
      setNewAmount(rec ? String(rec.baseAmount) : "");
      setError(null);
    }
  }, [open, presetEmployeeId, employees, store]);

  function submit() {
    setError(null);
    if (!employeeId) {
      setError("Choose an employee.");
      return;
    }
    const draft: ChangeRequestDraft = {
      employeeId,
      changeType,
      newAmount: Number(newAmount),
      effectiveDate,
      reason,
      justification,
      reviewCycleId: linkPerf && reviewCycle ? "custom-cycle" : profile?.employee.lastAppraisalDate ? "rev-2026-h1" : null,
      reviewCycleName: linkPerf
        ? reviewCycle || profile?.employee.lastAppraisalDate
          ? reviewCycle || "H1 2026 review"
          : null
        : null,
      componentKind:
        changeType === "temporary_allowance"
          ? "housing_allowance"
          : changeType === "deduction_setup"
            ? "custom_deduction"
            : null,
      asDraft,
    };
    try {
      store.submitChange(draft, actor);
      onSubmitted();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("Propose a salary change")}</SheetTitle>
          <SheetDescription>
            {t("Changes are date-effective and go to HR for approval. They are not written to the live record until approved.")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <Field label="Employee">
            <select
              className={SELECT_CLASS}
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                const rec = store.record(e.target.value);
                if (rec) setNewAmount(String(rec.baseAmount));
              }}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.role}
                </option>
              ))}
            </select>
          </Field>
          {profile ? (
            <p className="rounded-lg bg-secondary/70 px-3 py-2 text-xs text-muted-foreground">
              {t("Current")}{formatMoney(profile.record.baseAmount, profile.record.currency)} {t("· KPI")}{" "}
              {profile.employee.latestKpiScore ?? "-"} {t("· Last appraisal")}{" "}
              {profile.employee.lastAppraisalResult ?? "-"}
            </p>
          ) : null}
          <Field label="Change type">
            <select
              className={SELECT_CLASS}
              value={changeType}
              onChange={(e) => setChangeType(e.target.value as ChangeType)}
            >
              {CHANGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {changeTypeLabel(t)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="New amount">
              <Input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
              />
            </Field>
            <Field label="Effective date">
              <Input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Reason">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t("Short reason code explanation")}
            />
          </Field>
          <Field label="Justification">
            <textarea
              className={TEXTAREA_CLASS}
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder={t("Context for the approver")}
            />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={linkPerf}
              onChange={(e) => setLinkPerf(e.target.checked)}
            />
            {t("Link to performance / review cycle")}</label>
          {linkPerf ? (
            <Field label={t("Review cycle")}>
              <Input
                value={reviewCycle}
                onChange={(e) => setReviewCycle(e.target.value)}
                placeholder={t("H1 2026 review")}
              />
            </Field>
          ) : null}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={asDraft} onChange={(e) => setAsDraft(e.target.checked)} />
            {t("Save as draft (do not submit yet)")}</label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}</Button>
          <Button onClick={submit}>{asDraft ? t("Save draft") : t("Submit for approval")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
