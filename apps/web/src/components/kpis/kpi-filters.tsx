"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown, Download, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SELECT_CLASS } from "@/lib/kpis/format";
import { REVIEW_CYCLES, type BranchOption, type EmployeeOption, type KpiFilters } from "@/lib/kpis/types";
import { ROLE_TEMPLATES, departmentForRole, inferRoleTemplate } from "@/lib/kpis/templates";
import { cn } from "@/lib/utils";

export function KpiFiltersBar({
  filters,
  onChange,
  employees,
  branches,
  isAdmin,
  onExport,
  onEditTemplate,
}: {
  filters: KpiFilters;
  onChange: (patch: Partial<KpiFilters>) => void;
  employees: EmployeeOption[];
  branches: BranchOption[];
  isAdmin: boolean;
  onExport: () => void;
  onEditTemplate: () => void;
}) {
  const [more, setMore] = useState(false);
  const departments = [
    ...new Set(
      employees.map((e) =>
        departmentForRole(
          inferRoleTemplate(
            e.jobTitle,
            e.jobRoles?.map((r) => r.name),
          ),
        ),
      ),
    ),
  ].sort();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight">Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each metric has a <span className="font-medium text-foreground">target</span>.
            A manager enters the <span className="font-medium text-foreground">result</span>.
            The score is how close that result is to the target.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          {isAdmin ? (
            <Button size="sm" onClick={onEditTemplate}>
              Set up KPIs
            </Button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
        <FilterField label={isAdmin ? "Whose performance" : "Viewing"}>
          <select
            className={cn(SELECT_CLASS, "min-w-[180px]")}
            value={filters.employeeId}
            onChange={(e) => onChange({ employeeId: e.target.value })}
            disabled={!isAdmin}
          >
            <option value="">{isAdmin ? "Everyone" : "Me"}</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Time period">
          <select
            className={cn(SELECT_CLASS, "min-w-[140px]")}
            value={filters.cycle}
            onChange={(e) =>
              onChange({ cycle: e.target.value as KpiFilters["cycle"] })
            }
          >
            {REVIEW_CYCLES.map((c) => (
              <option key={c} value={c}>
                {c === "monthly"
                  ? "This month"
                  : c === "quarterly"
                    ? "This quarter"
                    : "This year"}
              </option>
            ))}
          </select>
        </FilterField>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9"
          onClick={() => setMore((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          More filters
          <ChevronDown className={cn("h-4 w-4 transition", more ? "rotate-180" : "")} />
        </Button>
      </div>

      {more ? (
        <div className="grid grid-cols-2 gap-2 rounded-xl border bg-card p-3 md:grid-cols-4">
          <FilterField label="Job type">
            <select
              className={SELECT_CLASS}
              value={filters.role}
              onChange={(e) =>
                onChange({ role: e.target.value as KpiFilters["role"] })
              }
            >
              <option value="">All jobs</option>
              {ROLE_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Department">
            <select
              className={SELECT_CLASS}
              value={filters.department}
              onChange={(e) => onChange({ department: e.target.value })}
            >
              <option value="">All departments</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Location">
            <select
              className={SELECT_CLASS}
              value={filters.branchId}
              onChange={(e) => onChange({ branchId: e.target.value })}
            >
              <option value="">All locations</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FilterField>
        </div>
      ) : null}
    </div>
  );
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
