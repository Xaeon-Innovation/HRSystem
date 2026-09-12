"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime, formatDays, SELECT_CLASS, TEXTAREA_CLASS, txnLabel } from "@/lib/leave/format";
import { isNegative } from "@/lib/leave/balance";
import type {
  LeaveBalance,
  LeaveBalanceTransaction,
  LeaveEmployee,
  LeaveType,
} from "@/lib/leave/types";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function LeaveBalancesTable({
  balances,
  employees,
  types,
  transactions,
  isAdmin,
  onAdjust,
}: {
  balances: LeaveBalance[];
  employees: LeaveEmployee[];
  types: LeaveType[];
  transactions: LeaveBalanceTransaction[];
  isAdmin: boolean;
  onAdjust: (employeeId: string, leaveTypeId: string, amount: number, note: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeId, setTypeId] = useState("");
  const [adjust, setAdjust] = useState<LeaveBalance | null>(null);
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("");
  const [historyFor, setHistoryFor] = useState<string | null>(null);

  const empMap = new Map(employees.map((e) => [e.id, e]));
  const typeMap = new Map(types.map((t) => [t.id, t]));

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return balances.filter((b) => {
      const emp = empMap.get(b.employeeId);
      const type = typeMap.get(b.leaveTypeId);
      if (!emp || !type?.tracksBalance) return false;
      if (typeId && b.leaveTypeId !== typeId) return false;
      if (q && !`${emp.name} ${emp.department} ${emp.branchName} ${type.name}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [balances, search, typeId, empMap, typeMap]);

  const history = transactions.filter(
    (t) => historyFor && `${t.employeeId}:${t.leaveTypeId}` === historyFor,
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t("Employee balances")}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("Opening, accrued, used, pending, and remaining days")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 w-44 pl-8"
                placeholder={t("Search people")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className={cn(SELECT_CLASS, "w-44")} value={typeId} onChange={(e) => setTypeId(e.target.value)}>
              <option value="">{t("All leave types")}</option>
              {types
                .filter((t) => t.tracksBalance)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto px-0 pb-2">
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-y bg-secondary/50 text-left text-xs text-muted-foreground">
              <th className="px-3 py-2">{t("Employee")}</th>
              <th className="px-3 py-2">{t("Type")}</th>
              <th className="px-3 py-2">{t("Opening")}</th>
              <th className="px-3 py-2">{t("Accrued")}</th>
              <th className="px-3 py-2">{t("Carry-over")}</th>
              <th className="px-3 py-2">{t("Adj.")}</th>
              <th className="px-3 py-2">{t("Used")}</th>
              <th className="px-3 py-2">{t("Pending")}</th>
              <th className="px-3 py-2">{t("Remaining")}</th>
              <th className="px-3 py-2">{t("Last accrual")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const emp = empMap.get(b.employeeId)!;
              const type = typeMap.get(b.leaveTypeId)!;
              const neg = isNegative(b);
              return (
                <tr key={b.id} className="border-b last:border-0 hover:bg-secondary/30">
                  <td className="px-3 py-2">
                    <p className="font-medium">{emp.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {emp.role} · {emp.department} · {emp.branchName}
                    </p>
                  </td>
                  <td className="px-3 py-2">{type.name}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDays(b.openingBalance)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDays(b.accrued)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDays(b.carryOver)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDays(b.adjustments)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDays(b.used)}</td>
                  <td className="px-3 py-2 tabular-nums">{formatDays(b.pending)}</td>
                  <td className="px-3 py-2">
                    <span className={cn("tabular-nums font-semibold", neg && "text-rose-700")}>
                      {formatDays(b.remaining)}
                    </span>
                    {neg ? (
                      <span className="ml-1 text-[10px] font-semibold uppercase text-rose-700">{t("Neg")}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatDateTime(b.lastAccrualAt)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setHistoryFor(`${b.employeeId}:${b.leaveTypeId}`)}
                      >
                        {t("Ledger")}</Button>
                      {isAdmin ? (
                        <Button size="sm" variant="outline" onClick={() => setAdjust(b)}>
                          {t("Adjust")}</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {historyFor ? (
          <div className="border-t px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{t("Balance transactions")}</p>
              <Button size="sm" variant="ghost" onClick={() => setHistoryFor(null)}>
                {t("Close")}</Button>
            </div>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No transactions yet.")}</p>
            ) : (
              <ul className="space-y-2">
                {history.slice(0, 12).map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium">{txnLabel(t.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.createdByName} · {formatDateTime(t.createdAt)} · {t.note}
                      </p>
                    </div>
                    <p className="tabular-nums">
                      {t.amount > 0 && t.type !== "DEDUCTION" && t.type !== "EXPIRY" && t.type !== "PENDING_RELEASE"
                        ? "+"
                        : t.type === "DEDUCTION" || t.type === "EXPIRY"
                          ? "−"
                          : ""}
                      {formatDays(Math.abs(t.amount))}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
        {adjust ? (
          <div className="border-t px-4 py-3">
            <p className="text-sm font-medium">{t("Adjust leave balance")}</p>
            <p className="text-xs text-muted-foreground">
              {t("Posts a MANUAL_ADJUSTMENT. Remaining days update immediately.")}</p>
            <Label className="mt-2 text-xs text-muted-foreground">
              {t("Days to add (use a negative number to subtract)")}</Label>
            <Input
              className="mt-1 h-9"
              type="number"
              step={0.5}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Label className="mt-2 text-xs text-muted-foreground">{t("Reason (required)")}</Label>
            <textarea className={`${TEXTAREA_CLASS} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} />
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                disabled={!note.trim()}
                onClick={() => {
                  onAdjust(adjust.employeeId, adjust.leaveTypeId, Number(amount), note);
                  setAdjust(null);
                  setNote("");
                }}
              >
                {t("Post adjustment")}</Button>
              <Button size="sm" variant="ghost" onClick={() => setAdjust(null)}>
                {t("Cancel")}</Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
