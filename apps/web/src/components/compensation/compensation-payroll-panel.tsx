"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CompensationPayslipPreview } from "@/components/compensation/compensation-payslip-preview";
import { CompEmptyState } from "@/components/compensation/compensation-states";
import { API_URL, getTokens } from "@/lib/api";
import { formatDate, formatHours, formatMoney } from "@/lib/compensation/format";
import type { PayrollInputRow, PayrollPeriod } from "@/lib/compensation/types";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

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
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
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
  const periodYm = period.start.slice(0, 7);

  async function exportPayrollCsv() {
    setExportBusy(true);
    setExportError(null);
    try {
      const { access } = getTokens();
      const res = await fetch(
        `${API_URL}/v1/compensation/payroll-export?period=${encodeURIComponent(periodYm)}`,
        {
          headers: access ? { Authorization: `Bearer ${access}` } : {},
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(
          typeof err.error === "string" ? err.error : "Export failed",
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payroll-export-${periodYm}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <Card className="border-primary/10 bg-gradient-to-br from-white to-accent/20">
        <CardHeader className="pb-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base">{period.label} {t("payroll inputs")}</CardTitle>
              <p className="text-xs text-muted-foreground">
                {t("Period")}{formatDate(period.start)} – {formatDate(period.end)} {t("· Cutoff")}{" "}
                {formatDate(period.cutoff)}{t(". Ready for a payroll engine, no country tax calc yet.")}</p>
            </div>
            {isAdmin ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full shrink-0 sm:w-auto"
                disabled={exportBusy}
                onClick={() => void exportPayrollCsv()}
              >
                {exportBusy ? t("Exporting…") : t("Export payroll CSV")}
              </Button>
            ) : null}
          </div>
          {exportError ? (
            <p className="text-xs text-destructive">{exportError}</p>
          ) : null}
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
          title={t("No payroll inputs")}
          description={t("Compensation records for employees in scope will appear here.")}
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("By employee")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto px-0 pb-0">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-y bg-secondary/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t("Employee")}</th>
                    <th className="px-3 py-2 font-medium">{t("Hours")}</th>
                    <th className="px-3 py-2 font-medium">{t("Base")}</th>
                    <th className="px-3 py-2 font-medium">{t("Allow.")}</th>
                    <th className="px-3 py-2 font-medium">{t("OT / var.")}</th>
                    <th className="px-3 py-2 font-medium">{t("Deduct")}</th>
                    <th className="px-4 py-2 font-medium">{t("Net")}</th>
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
                          : "-"}
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
                      {t("Leave, attendance, overtime, and manual adjustments for this cycle")}</p>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {selected.hourlyRate != null ? (
                      <p>
                        {t("Hourly")}{formatMoney(selected.hourlyRate ?? 0, selected.currency)}{t("/hr ·")}{" "}
                        {formatHours(selected.regularHours)} {t("regular ·")}{" "}
                        {formatHours(selected.overtimeHoursWorked)} {t("OT")}</p>
                    ) : null}
                    <p>{t("Overtime pay")}{formatMoney(selected.overtime, selected.currency)}</p>
                    <p>{t("Unpaid leave")}{formatMoney(selected.unpaidLeaveDeduction, selected.currency)}</p>
                    <p>{t("Absence")}{formatMoney(selected.absenceDeduction, selected.currency)}</p>
                    <p>{t("Attendance impact")}{formatMoney(selected.attendanceImpact, selected.currency)}</p>
                    <p>{t("Manual")}{formatMoney(selected.manualAdjustments, selected.currency)}</p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenEmployee(selected.employeeId)}
                    >
                      {t("Open profile")}</Button>
                    {isAdmin ? (
                      <div className="space-y-2 border-t pt-3">
                        <Input
                          type="number"
                          placeholder={t("Manual adjustment")}
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                        />
                        <Input
                          placeholder={t("Note")}
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
                          {t("Post adjustment")}</Button>
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
