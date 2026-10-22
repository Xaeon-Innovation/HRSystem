"use client";

import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CompEmptyState } from "@/components/compensation/compensation-states";
import {
  BandBadge,
  CompStatusBadge,
} from "@/components/compensation/compensation-status-badge";
import {
  formatCompa,
  formatHours,
  formatMoney,
  payStructureLabel,
  rateUnit,
  SELECT_CLASS,
} from "@/lib/compensation/format";
import { toMonthlyEquivalent } from "@/lib/compensation/calc";
import type { CompensationStore } from "@/lib/compensation/store";
import type {
  CompEmployee,
  CompStatus,
  EmployeeFilters,
  PayStructure,
} from "@/lib/compensation/types";
import { COMP_STATUSES, PAY_STRUCTURES } from "@/lib/compensation/types";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function CompensationEmployeesTable({
  employees,
  store,
  filters,
  onChange,
  onOpen,
}: {
  employees: CompEmployee[];
  store: CompensationStore;
  filters: EmployeeFilters;
  onChange: (patch: Partial<EmployeeFilters>) => void;
  onOpen: (id: string) => void;
}) {
  const departments = [...new Set(employees.map((e) => e.department))].sort();
  const branches = [
    ...new Map(employees.map((e) => [e.branchId, e.branchName])).entries(),
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t("Employee compensation")}</CardTitle>
            <p className="text-xs text-ink-muted">
              {t("Date-effective records, pay structure, and band position")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-ink-muted" />
              <Input
                className="h-9 w-44 pl-8"
                placeholder={t("Name, ID, role")}
                value={filters.search}
                onChange={(e) => onChange({ search: e.target.value })}
              />
            </div>
            <select
              className={cn(SELECT_CLASS, "w-40")}
              value={filters.department}
              onChange={(e) => onChange({ department: e.target.value })}
            >
              <option value="">{t("All departments")}</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              className={cn(SELECT_CLASS, "w-36")}
              value={filters.status}
              onChange={(e) => onChange({ status: e.target.value as CompStatus | "" })}
            >
              <option value="">{t("Any status")}</option>
              {COMP_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3">
          <select
            className={SELECT_CLASS}
            value={filters.branchId}
            onChange={(e) => onChange({ branchId: e.target.value })}
          >
            <option value="">{t("All branches")}</option>
            {branches.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            className={SELECT_CLASS}
            value={filters.payStructure}
            onChange={(e) => onChange({ payStructure: e.target.value as PayStructure | "" })}
          >
            <option value="">{t("Any pay structure")}</option>
            {PAY_STRUCTURES.map((s) => (
              <option key={s} value={s}>
                {payStructureLabel(s)}
              </option>
            ))}
          </select>
          <select
            className={SELECT_CLASS}
            value={filters.band}
            onChange={(e) =>
              onChange({ band: e.target.value as EmployeeFilters["band"] })
            }
          >
            <option value="all">{t("Any band position")}</option>
            <option value="below">{t("Below band")}</option>
            <option value="in_band">{t("In band")}</option>
            <option value="above">{t("Above band")}</option>
          </select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto px-0 pb-0">
        {employees.length === 0 ? (
          <div className="px-4 pb-4">
            <CompEmptyState
              title={t("No matching employees")}
              description={t("Try clearing filters or search for a different name, role, or department.")}
            />
          </div>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-y bg-surface-2 text-xs text-ink-muted">
              <tr>
                <th className="px-4 py-2 font-medium">{t("Employee")}</th>
                <th className="px-3 py-2 font-medium">{t("Structure")}</th>
                <th className="px-3 py-2 font-medium">{t("Base / rate")}</th>
                <th className="px-3 py-2 font-medium">{t("Monthly equiv.")}</th>
                <th className="px-3 py-2 font-medium">{t("Band")}</th>
                <th className="px-4 py-2 font-medium">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const rec = store.record(emp.id);
                if (!rec) return null;
                const monthly = toMonthlyEquivalent(rec);
                const band = store.bandOf(emp.id);
                return (
                  <tr
                    key={emp.id}
                    className="cursor-pointer border-b last:border-0 hover:bg-accent/30"
                    onClick={() => onOpen(emp.id)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-xs text-ink-muted">
                        {emp.employeeCode} · {emp.role} · {emp.department}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {payStructureLabel(rec.payStructure)}
                      {rec.payStructure === "hourly" ? (
                        <p className="mt-0.5 text-[11px] text-ink-muted">
                          {formatHours(store.cycleHours(emp.id)?.workedHours ?? 0)} {t("this cycle")}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 tabular-nums">
                      {formatMoney(rec.baseAmount, rec.currency)}
                      <span className="text-xs text-ink-muted">
                        {rateUnit(rec.payStructure)}
                      </span>
                    </td>
                    <td className="px-3 py-3 tabular-nums font-medium">
                      {formatMoney(monthly, rec.currency)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1">
                        <BandBadge position={band.position} />
                        <span className="text-[11px] text-ink-muted">
                          {band.band ? `${band.band.grade} · ${formatCompa(band.compaRatio)}` : "-"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <CompStatusBadge status={rec.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </CardContent>
    </Card>
  );
}
