"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VariableStatusBadge } from "@/components/compensation/compensation-status-badge";
import { CompEmptyState } from "@/components/compensation/compensation-states";
import {
  bonusTypeLabel,
  formatDate,
  formatMoney,
  SELECT_CLASS,
  TEXTAREA_CLASS,
  variableCycleLabel,
} from "@/lib/compensation/format";
import type { CompensationStore } from "@/lib/compensation/store";
import {
  BONUS_TYPES,
  VARIABLE_CYCLES,
  type BonusType,
  type CompActor,
  type CompEmployee,
  type VariableCycle,
  type VariableKind,
  type VariablePay,
} from "@/lib/compensation/types";

export function CompensationVariablePanel({
  items,
  employees,
  store,
  actor,
  isAdmin,
  onChanged,
  onOpenEmployee,
}: {
  items: VariablePay[];
  employees: CompEmployee[];
  store: CompensationStore;
  actor: CompActor;
  isAdmin: boolean;
  onChanged: () => void;
  onOpenEmployee: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<VariableKind>("bonus");
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [bonusType, setBonusType] = useState<BonusType>("spot");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<VariableCycle>("one_off");
  const [formula, setFormula] = useState("");
  const [kpiLinked, setKpiLinked] = useState(true);
  const [start, setStart] = useState(store.period().start);
  const [end, setEnd] = useState(store.period().end);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    try {
      store.submitVariable(
        {
          employeeId,
          kind,
          bonusType: kind === "bonus" ? bonusType : null,
          amount: Number(amount),
          cycle,
          commissionFormula: kind === "commission" ? formula || null : null,
          kpiLinked,
          payoutPeriodStart: start,
          payoutPeriodEnd: end,
          notes,
        },
        actor,
      );
      setOpen(false);
      setAmount("");
      setNotes("");
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Bonuses, commissions, and KPI-linked incentives for the current and upcoming cycles.
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "New variable pay"}
        </Button>
      </div>

      {open ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Variable pay</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Field label="Employee">
              <select className={SELECT_CLASS} value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Kind">
              <select
                className={SELECT_CLASS}
                value={kind}
                onChange={(e) => setKind(e.target.value as VariableKind)}
              >
                <option value="bonus">Bonus</option>
                <option value="commission">Commission</option>
              </select>
            </Field>
            {kind === "bonus" ? (
              <Field label="Bonus type">
                <select
                  className={SELECT_CLASS}
                  value={bonusType}
                  onChange={(e) => setBonusType(e.target.value as BonusType)}
                >
                  {BONUS_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {bonusTypeLabel(t)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Commission formula">
                <Input
                  value={formula}
                  onChange={(e) => setFormula(e.target.value)}
                  placeholder="collected_revenue * 0.04"
                />
              </Field>
            )}
            <Field label="Amount">
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label="Cycle">
              <select
                className={SELECT_CLASS}
                value={cycle}
                onChange={(e) => setCycle(e.target.value as VariableCycle)}
              >
                {VARIABLE_CYCLES.map((c) => (
                  <option key={c} value={c}>
                    {variableCycleLabel(c)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payout start">
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </Field>
            <Field label="Payout end">
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={kpiLinked}
                onChange={(e) => setKpiLinked(e.target.checked)}
              />
              Link to latest KPI / appraisal score
            </label>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <textarea
                className={`${TEXTAREA_CLASS} mt-1.5`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
            <div>
              <Button size="sm" onClick={submit}>
                Submit for approval
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Bonus & commission ledger</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto px-0 pb-0">
          {items.length === 0 ? (
            <div className="px-4 pb-4">
              <CompEmptyState
                title="No variable pay yet"
                description="Add a bonus or commission and route it for approval before it hits payroll inputs."
              />
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-y bg-secondary/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Employee</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Period</th>
                  <th className="px-3 py-2 font-medium">KPI</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => (
                  <tr key={v.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-left font-medium hover:underline"
                        onClick={() => onOpenEmployee(v.employeeId)}
                      >
                        {v.employeeName}
                      </button>
                      <p className="text-xs text-muted-foreground">{v.notes || v.department}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {v.kind === "bonus" && v.bonusType
                        ? bonusTypeLabel(v.bonusType)
                        : "Commission"}
                      {v.commissionFormula ? (
                        <p className="text-[11px] text-muted-foreground">{v.commissionFormula}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 tabular-nums font-medium">
                      {formatMoney(v.amount, v.currency)}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {formatDate(v.payoutPeriodStart)} – {formatDate(v.payoutPeriodEnd)}
                      <p className="text-muted-foreground">{variableCycleLabel(v.cycle)}</p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {v.kpiLinked ? v.kpiScore ?? "Linked" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <VariableStatusBadge status={v.status} />
                        {isAdmin && (v.status === "pending" || v.status === "draft") ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                store.decideVariable(v.id, "approved", actor);
                                onChanged();
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                store.decideVariable(v.id, "rejected", actor, "Declined");
                                onChanged();
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
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
