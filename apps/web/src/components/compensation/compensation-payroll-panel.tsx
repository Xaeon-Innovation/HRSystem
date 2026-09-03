"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CompensationPayslipPreview } from "@/components/compensation/compensation-payslip-preview";
import { CompEmptyState } from "@/components/compensation/compensation-states";
import { formatDate, formatHours, formatMoney } from "@/lib/compensation/format";
import type { PayrollInputRow, PayrollPeriod } from "@/lib/compensation/types";
import { cn } from "@/lib/utils";

export function CompensationPayrollPanel({
  rows,
  period,
  isAdmin,
  onOpenEmployee,
  onManualAdjust,
}: {
  rows: PayrollInputRow[];
  period: PayrollPeriod;
  isAdmin: boolean;
  onOpenEmployee: (id: string) => void;
  onManualAdjust: (employeeId: string, amount: number, note: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(rows[0]?.employeeId ?? null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const selected = rows.find((r) => r.employeeId === selectedId) ?? null;
  const totals = rows.reduce(
    (acc, r) => ({
      gross: acc.gross + r.gross,
      deductions: acc.deductions + r.totalDeductions,
      net: acc.net + r.net,
      incentives: acc.incentives + r.incentives,
    }),
    { gross: 0, deductions: 0, net: 0, incentives: 0 },
  );
  const currency = rows[0]?.currency ?? "EGP";

  return (
    <div className="space-y-3">
      <Card className="border-primary/10 bg-gradient-to-br from-white to-accent/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{period.label} payroll inputs</CardTitle>
          <p className="text-xs text-muted-foreground">
            Period {formatDate(period.start)} – {formatDate(period.end)} · Cutoff{" "}
            {formatDate(period.cutoff)}. Ready for a payroll engine — no country tax calc yet.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="Gross" value={formatMoney(totals.gross, currency)} />
          <Stat label="Incentives" value={formatMoney(totals.incentives, currency)} />
          <Stat label="Deductions" value={formatMoney(totals.deductions, currency)} />
          <Stat label="Net payable" value={formatMoney(totals.net, currency)} />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <CompEmptyState
          title="No payroll inputs"
          description="Compensation records for employees in scope will appear here."
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By employee</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto px-0 pb-0">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-y bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">Employee</th>
                    <th className="px-3 py-2 font-medium">Hours</th>
                    <th className="px-3 py-2 font-medium">Base</th>
                    <th className="px-3 py-2 font-medium">Allow.</th>
                    <th className="px-3 py-2 font-medium">OT / var.</th>
                    <th className="px-3 py-2 font-medium">Deduct</th>
                    <th className="px-4 py-2 font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.employeeId}
                      className={cn(
                        "cursor-pointer border-b last:border-0 hover:bg-accent/30",
                        selectedId === r.employeeId && "bg-accent/40",
                      )}
                      onClick={() => setSelectedId(r.employeeId)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.employeeName}</p>
                        <p className="text-xs text-muted-foreground">{r.leaveImpactNote}</p>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-xs">
                        {r.payStructure === "hourly" || r.workedHours > 0
                          ? formatHours(r.workedHours)
                          : "—"}
                      </td>
                      <td className="px-3 py-3 tabular-nums">{formatMoney(r.baseSalary, r.currency)}</td>
                      <td className="px-3 py-3 tabular-nums">{formatMoney(r.allowances, r.currency)}</td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatMoney(r.overtime + r.incentives, r.currency)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-rose-700">
                        {formatMoney(r.totalDeductions, r.currency)}
                      </td>
                      <td className="px-4 py-3 tabular-nums font-semibold">
                        {formatMoney(r.net, r.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {selected ? (
              <>
                <CompensationPayslipPreview breakdown={selected.breakdown} />
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{selected.employeeName}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Leave, attendance, overtime, and manual adjustments for this cycle
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.hourlyRate != null ? (
                      <p>
                        Hourly {formatMoney(selected.hourlyRate ?? 0, selected.currency)}/hr ·{" "}
                        {formatHours(selected.regularHours)} regular ·{" "}
                        {formatHours(selected.overtimeHoursWorked)} OT
                      </p>
                    ) : null}
                    <p>Overtime pay {formatMoney(selected.overtime, selected.currency)}</p>
                    <p>Unpaid leave {formatMoney(selected.unpaidLeaveDeduction, selected.currency)}</p>
                    <p>Absence {formatMoney(selected.absenceDeduction, selected.currency)}</p>
                    <p>Attendance impact {formatMoney(selected.attendanceImpact, selected.currency)}</p>
                    <p>Manual {formatMoney(selected.manualAdjustments, selected.currency)}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenEmployee(selected.employeeId)}
                    >
                      Open profile
                    </Button>
                    {isAdmin ? (
                      <div className="space-y-2 border-t pt-3">
                        <Input
                          type="number"
                          placeholder="Manual adjustment"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                        <Input
                          placeholder="Note"
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                        />
                        <Button
                          size="sm"
                          disabled={!amount || !note.trim()}
                          onClick={() => {
                            onManualAdjust(selected.employeeId, Number(amount), note.trim());
                            setAmount("");
                            setNote("");
                          }}
                        >
                          Post adjustment
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-card px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
