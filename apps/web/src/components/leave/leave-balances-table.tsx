"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Chip, HatchBar, PersonCell, PillSelect, type HatchTone } from "@/components/elevora";
import type { Tone } from "@/lib/status-tone";
import { LeaveEmptyState } from "@/components/leave/leave-states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatDays, TEXTAREA_CLASS, txnLabel } from "@/lib/leave/format";
import { isNegative } from "@/lib/leave/balance";
import type {
  LeaveBalance,
  LeaveBalanceTransaction,
  LeaveBalanceTxnType,
  LeaveEmployee,
  LeaveType,
} from "@/lib/leave/types";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

const CARD_TONES: HatchTone[] = ["accent", "yellow", "warn", "soft"];

function txnTone(type: LeaveBalanceTxnType): Tone {
  switch (type) {
    case "ACCRUAL":
    case "CARRY_OVER":
    case "CANCELLATION_CREDIT":
      return "ok";
    case "DEDUCTION":
    case "MANUAL_ADJUSTMENT":
      return "warn";
    case "EXPIRY":
      return "danger";
    case "PENDING_RESERVE":
    case "PENDING_RELEASE":
      return "info";
    default:
      return "neutral";
  }
}

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

  const empMap = new Map(employees.map((e) => [e.id, e]));
  const typeMap = new Map(types.map((lt) => [lt.id, lt]));

  const summaryCards = useMemo(() => {
    const tracked = types.filter((lt) => lt.tracksBalance && lt.enabled).slice(0, 4);
    return tracked.map((lt, i) => {
      const rows = balances.filter((b) => b.leaveTypeId === lt.id);
      const remaining = rows.reduce((s, b) => s + b.remaining, 0);
      const used = rows.reduce((s, b) => s + b.used, 0);
      const pending = rows.reduce((s, b) => s + b.pending, 0);
      const pool = used + pending + Math.max(0, remaining);
      const pct = pool > 0 ? Math.min(100, (Math.max(0, remaining) / pool) * 100) : 0;
      return {
        type: lt,
        remaining,
        total: pool,
        percent: pct,
        tone: CARD_TONES[i % CARD_TONES.length]!,
      };
    });
  }, [balances, types]);

  const ledger = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((txn) => {
        if (typeId && txn.leaveTypeId !== typeId) return false;
        const emp = empMap.get(txn.employeeId);
        if (!emp) return false;
        if (q && !`${emp.name} ${txn.note} ${txnLabel(txn.type)}`.toLowerCase().includes(q)) {
          return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [transactions, search, typeId, empMap]);

  const typeLabel =
    types.find((lt) => lt.id === typeId)?.name ?? t("All leave types");

  return (
    <div className="space-y-4">
      {summaryCards.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {summaryCards.map((c) => (
            <div
              key={c.type.id}
              className="min-w-0 rounded-sm border border-line bg-surface px-4 py-3"
            >
              <p className="text-xs text-ink-muted">{c.type.name}</p>
              <p className="mt-1 text-[26px] font-semibold tabular tracking-tight text-ink">
                {fmtNum(c.remaining)}
                <span className="ms-1 text-[15px] font-medium text-ink-muted">
                  / {fmtNum(c.total)}
                </span>
              </p>
              <HatchBar className="mt-2" size="sm" percent={c.percent} tone={c.tone} />
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-sm border border-line bg-surface">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-ink">{t("Ledger")}</h2>
            <p className="text-xs text-ink-muted">
              {isAdmin ? t("All employees · balance movements") : t("Your balance movements")}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-muted" />
              <Input
                className="h-9 w-full pl-8 sm:w-44"
                placeholder={t("Search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <PillSelect label={typeLabel} className="w-full sm:w-auto">
              <select
                aria-label={t("Leave type")}
                className="absolute inset-0 cursor-pointer opacity-0"
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
              >
                <option value="">{t("All leave types")}</option>
                {types
                  .filter((lt) => lt.tracksBalance)
                  .map((lt) => (
                    <option key={lt.id} value={lt.id}>
                      {lt.name}
                    </option>
                  ))}
              </select>
            </PillSelect>
          </div>
        </div>

        <div className="overflow-x-auto">
          {ledger.length === 0 ? (
            <div className="px-4 pb-4">
              <LeaveEmptyState
                title={t("No ledger entries")}
                description={t("Try another leave type or search term.")}
              />
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2 text-left text-[11px] uppercase tracking-wide text-ink-muted">
                  <th className="px-3 py-2.5 font-medium">{t("Date")}</th>
                  {isAdmin ? (
                    <th className="px-3 py-2.5 font-medium">{t("Employee")}</th>
                  ) : null}
                  <th className="px-3 py-2.5 font-medium">{t("Entry")}</th>
                  <th className="px-3 py-2.5 font-medium">{t("Note")}</th>
                  <th className="px-3 py-2.5 text-end font-medium">{t("Days")}</th>
                  <th className="px-3 py-2.5 text-end font-medium">{t("Balance")}</th>
                  {isAdmin ? <th className="px-3 py-2.5 font-medium" /> : null}
                </tr>
              </thead>
              <tbody>
                {ledger.map((txn) => {
                  const emp = empMap.get(txn.employeeId);
                  const signed =
                    txn.type === "DEDUCTION" || txn.type === "EXPIRY"
                      ? -Math.abs(txn.amount)
                      : txn.type === "PENDING_RESERVE"
                        ? -Math.abs(txn.amount)
                        : txn.amount;
                  const bal = balances.find(
                    (b) =>
                      b.employeeId === txn.employeeId && b.leaveTypeId === txn.leaveTypeId,
                  );
                  return (
                    <tr
                      key={txn.id}
                      className="border-b border-line last:border-0 hover:bg-surface-2/80"
                    >
                      <td className="px-3 py-3 tabular-nums text-ink">
                        {formatDate(txn.createdAt.slice(0, 10))}
                      </td>
                      {isAdmin ? (
                        <td className="px-3 py-3">
                          <PersonCell name={emp?.name ?? "—"} subtitle={emp?.department} />
                        </td>
                      ) : null}
                      <td className="px-3 py-3">
                        <Chip tone={txnTone(txn.type)}>{txnLabel(txn.type)}</Chip>
                      </td>
                      <td className="max-w-[14rem] truncate px-3 py-3 text-ink-muted">
                        {txn.note || "—"}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 text-end font-semibold tabular-nums",
                          signed > 0 ? "text-accent-strong" : "text-ink",
                        )}
                      >
                        {signed > 0 ? "+" : ""}
                        {fmtNum(signed)}
                      </td>
                      <td className="px-3 py-3 text-end tabular-nums text-ink">
                        {fmtNum(txn.balanceAfter)}
                      </td>
                      {isAdmin ? (
                        <td className="px-3 py-3 text-end">
                          {bal ? (
                            <Button size="sm" variant="ghost" onClick={() => setAdjust(bal)}>
                              {t("Adjust")}
                            </Button>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {adjust ? (
          <div className="border-t border-line px-4 py-3">
            <p className="text-sm font-medium text-ink">{t("Adjust leave balance")}</p>
            <p className="text-xs text-ink-muted">
              {t("Posts a MANUAL_ADJUSTMENT. Remaining days update immediately.")}
            </p>
            <Label className="mt-2 text-xs text-ink-muted">
              {t("Days to add (use a negative number to subtract)")}
            </Label>
            <Input
              className="mt-1 h-9"
              type="number"
              step={0.5}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <Label className="mt-2 text-xs text-ink-muted">{t("Reason (required)")}</Label>
            <textarea
              className={`${TEXTAREA_CLASS} mt-1`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button
                size="sm"
                className="w-full sm:w-auto"
                disabled={!note.trim()}
                onClick={() => {
                  onAdjust(adjust.employeeId, adjust.leaveTypeId, Number(amount), note);
                  setAdjust(null);
                  setNote("");
                }}
              >
                {t("Post adjustment")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="w-full sm:w-auto"
                onClick={() => setAdjust(null)}
              >
                {t("Cancel")}
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Keep per-employee remaining glance for admins when searching people */}
      {isAdmin && search.trim() ? (
        <BalanceGlance
          balances={balances}
          employees={employees}
          types={types}
          search={search}
          typeId={typeId}
        />
      ) : null}
    </div>
  );
}

function BalanceGlance({
  balances,
  employees,
  types,
  search,
  typeId,
}: {
  balances: LeaveBalance[];
  employees: LeaveEmployee[];
  types: LeaveType[];
  search: string;
  typeId: string;
}) {
  const empMap = new Map(employees.map((e) => [e.id, e]));
  const typeMap = new Map(types.map((lt) => [lt.id, lt]));
  const q = search.trim().toLowerCase();
  const rows = balances.filter((b) => {
    const emp = empMap.get(b.employeeId);
    const type = typeMap.get(b.leaveTypeId);
    if (!emp || !type?.tracksBalance) return false;
    if (typeId && b.leaveTypeId !== typeId) return false;
    return `${emp.name} ${emp.department} ${type.name}`.toLowerCase().includes(q);
  });
  if (rows.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-sm border border-line bg-surface">
      <div className="border-b border-line px-4 py-2.5">
        <h3 className="text-sm font-semibold text-ink">{t("Matching balances")}</h3>
      </div>
      <ul className="divide-y divide-line">
        {rows.slice(0, 8).map((b) => {
          const emp = empMap.get(b.employeeId)!;
          const type = typeMap.get(b.leaveTypeId)!;
          const neg = isNegative(b);
          return (
            <li key={b.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <PersonCell name={emp.name} subtitle={type.name} />
              <div className="min-w-[5rem] text-end">
                <p
                  className={cn(
                    "text-sm font-semibold tabular-nums",
                    neg ? "text-danger" : "text-ink",
                  )}
                >
                  {formatDays(b.remaining)}
                </p>
                <HatchBar
                  size="xs"
                  percent={balanceUsedPercent(b)}
                  tone={neg ? "danger" : "accent"}
                  animate={false}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function fmtNum(value: number) {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function balanceUsedPercent(b: LeaveBalance): number {
  const pool = b.used + b.pending + Math.max(0, b.remaining);
  if (pool <= 0) return 0;
  return Math.min(100, ((b.used + b.pending) / pool) * 100);
}
