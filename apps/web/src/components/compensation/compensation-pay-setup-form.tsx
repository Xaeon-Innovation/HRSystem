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
  PAY_STRUCTURES,
  type CompActor,
  type CompEmployee,
  type PayStructure,
} from "@/lib/compensation/types";
import {
  formatMoney,
  payStructureLabel,
  SELECT_CLASS,
} from "@/lib/compensation/format";
import type { CompensationStore } from "@/lib/compensation/store";
import { t } from "@/i18n";

export function CompensationPaySetupForm({
  open,
  onOpenChange,
  store,
  actor,
  employees,
  presetEmployeeId,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: CompensationStore;
  actor: CompActor;
  employees: CompEmployee[];
  presetEmployeeId?: string | null;
  onSaved: () => void;
}) {
  const [employeeId, setEmployeeId] = useState(presetEmployeeId ?? employees[0]?.id ?? "");
  const [payStructure, setPayStructure] = useState<PayStructure>("hourly");
  const [rate, setRate] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState("40");
  const [error, setError] = useState<string | null>(null);

  const rec = employeeId ? store.record(employeeId) : null;

  useEffect(() => {
    if (!open) return;
    const id = presetEmployeeId ?? employees[0]?.id ?? "";
    setEmployeeId(id);
    const current = id ? store.record(id) : null;
    setPayStructure("hourly");
    setRate(current?.payStructure === "hourly" ? String(current.baseAmount) : "");
    setHoursPerWeek(String(current?.hoursPerWeek ?? 40));
    setError(null);
  }, [open, presetEmployeeId, employees, store]);

  function onEmployeeChange(id: string) {
    setEmployeeId(id);
    const current = store.record(id);
    setPayStructure("hourly");
    setRate(current?.payStructure === "hourly" ? String(current.baseAmount) : "");
    setHoursPerWeek(String(current?.hoursPerWeek ?? 40));
  }

  function save() {
    setError(null);
    try {
      store.setPaySetup(
        {
          employeeId,
          payStructure,
          baseAmount: Number(rate),
          hoursPerWeek: Number(hoursPerWeek),
        },
        actor,
      );
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("Set hourly rate")}</SheetTitle>
          <SheetDescription>
            {t("Hourly employees are paid from clock in/out hours this cycle. Time over the daily standard (weekly hours ÷ 5) is overtime at 1.5×.")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <Field label="Employee">
            <select
              className={SELECT_CLASS}
              value={employeeId}
              onChange={(e) => onEmployeeChange(e.target.value)}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} · {e.role}
                </option>
              ))}
            </select>
          </Field>
          {rec ? (
            <p className="rounded-lg bg-surface-2/70 px-3 py-2 text-xs text-ink-muted">
              {t("Current")}{payStructureLabel(rec.payStructure)} ·{" "}
              {formatMoney(rec.baseAmount, rec.currency)}
              {rec.payStructure === "hourly" ? "/hr" : ""}
            </p>
          ) : null}
          <Field label="Pay structure">
            <select
              className={SELECT_CLASS}
              value={payStructure}
              onChange={(e) => setPayStructure(e.target.value as PayStructure)}
            >
              {PAY_STRUCTURES.map((s) => (
                <option key={s} value={s}>
                  {payStructureLabel(s)}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={payStructure === "hourly" ? "Hourly rate" : "Base amount"}>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
            </Field>
            <Field label="Standard hours / week">
              <Input
                type="number"
                min="1"
                step="1"
                value={hoursPerWeek}
                onChange={(e) => setHoursPerWeek(e.target.value)}
              />
            </Field>
          </div>
          {payStructure === "hourly" ? (
            <p className="text-xs text-ink-muted">
              {t("Payroll uses actual clocked hours × this rate. Overtime starts after")}{" "}
              {(Number(hoursPerWeek) || 40) / 5} {t("hours in a day.")}</p>
          ) : null}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}</Button>
          <Button onClick={save}>{t("Save rate")}</Button>
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
