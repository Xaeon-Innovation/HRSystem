"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SELECT_CLASS } from "@/lib/leave/format";
import type { LeaveAccrualMethod, LeavePolicy, LeaveType } from "@/lib/leave/types";

export function LeaveAccrualSettings({
  policies,
  types,
  onChange,
  onRunAccrual,
  lastPosted,
}: {
  policies: LeavePolicy[];
  types: LeaveType[];
  onChange: (id: string, patch: Partial<LeavePolicy>) => void;
  onRunAccrual: () => void;
  lastPosted: string | null;
}) {
  const typeName = (id: string) => types.find((t) => t.id === id)?.name ?? id;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Accrual & carry-over</CardTitle>
            <p className="text-xs text-muted-foreground">
              Example: add 2 days on the 1st of every month. Ready for a scheduler to call the same posting function.
            </p>
          </div>
          <Button size="sm" onClick={onRunAccrual}>
            Run monthly accrual now
          </Button>
        </div>
        {lastPosted ? (
          <p className="text-xs text-muted-foreground">{lastPosted}</p>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {policies
          .filter((p) => types.find((t) => t.id === p.leaveTypeId)?.tracksBalance)
          .map((p) => (
            <div key={p.id} className="rounded-xl border p-3">
              <p className="font-medium">{typeName(p.leaveTypeId)}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Annual entitlement">
                  <Input
                    type="number"
                    className="h-9"
                    value={p.annualEntitlement}
                    onChange={(e) => onChange(p.id, { annualEntitlement: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Accrual method">
                  <select
                    className={SELECT_CLASS}
                    value={p.accrual.method}
                    onChange={(e) =>
                      onChange(p.id, {
                        accrual: { ...p.accrual, method: e.target.value as LeaveAccrualMethod },
                      })
                    }
                  >
                    <option value="monthly_fixed">Fixed days / month</option>
                    <option value="annual_divided">Annual ÷ 12</option>
                    <option value="tenure_tiered">By years of service</option>
                  </select>
                </Field>
                <Field label="Days each month">
                  <Input
                    type="number"
                    step={0.5}
                    className="h-9"
                    value={p.accrual.monthlyDays}
                    onChange={(e) =>
                      onChange(p.id, {
                        accrual: { ...p.accrual, monthlyDays: Number(e.target.value) },
                      })
                    }
                  />
                </Field>
                <Field label="Run on day">
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    className="h-9"
                    value={p.accrual.runDayOfMonth}
                    onChange={(e) =>
                      onChange(p.id, {
                        accrual: { ...p.accrual, runDayOfMonth: Number(e.target.value) },
                      })
                    }
                  />
                </Field>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={p.accrual.enabled}
                    onChange={(e) =>
                      onChange(p.id, { accrual: { ...p.accrual, enabled: e.target.checked } })
                    }
                  />
                  Accrual on
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={p.accrual.prorateNewHires}
                    onChange={(e) =>
                      onChange(p.id, { accrual: { ...p.accrual, prorateNewHires: e.target.checked } })
                    }
                  />
                  Pro-rate new hires
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={p.carryOver.enabled}
                    onChange={(e) =>
                      onChange(p.id, { carryOver: { ...p.carryOver, enabled: e.target.checked } })
                    }
                  />
                  Allow carry-over
                </label>
              </div>
              {p.carryOver.enabled ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field label="Max carry-over days">
                    <Input
                      type="number"
                      className="h-9"
                      value={p.carryOver.maxDays}
                      onChange={(e) =>
                        onChange(p.id, {
                          carryOver: { ...p.carryOver, maxDays: Number(e.target.value) },
                        })
                      }
                    />
                  </Field>
                  <Field label="Expiry month">
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      className="h-9"
                      value={p.carryOver.expiryMonth}
                      onChange={(e) =>
                        onChange(p.id, {
                          carryOver: { ...p.carryOver, expiryMonth: Number(e.target.value) },
                        })
                      }
                    />
                  </Field>
                  <Field label="Expiry day">
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      className="h-9"
                      value={p.carryOver.expiryDay}
                      onChange={(e) =>
                        onChange(p.id, {
                          carryOver: { ...p.carryOver, expiryDay: Number(e.target.value) },
                        })
                      }
                    />
                  </Field>
                </div>
              ) : null}
              {p.accrual.method === "tenure_tiered" ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Tiers: {p.accrual.tenureTiers.map((t) => `${t.minYears}y → ${t.monthlyDays}d`).join(" · ") || "None"}
                </p>
              ) : null}
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
