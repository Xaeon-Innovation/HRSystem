"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getUser } from "@/lib/api";
import { KpiFiltersBar } from "@/components/kpis/kpi-filters";
import { KpiSummaryCards } from "@/components/kpis/kpi-summary-cards";
import { KpiCharts } from "@/components/kpis/kpi-charts";
import { KpiMetricList } from "@/components/kpis/kpi-metric-list";
import { KpiTable } from "@/components/kpis/kpi-table";
import { KpiDetailDrawer } from "@/components/kpis/kpi-detail-drawer";
import { KpiTemplateDialog } from "@/components/kpis/kpi-template-dialog";
import {
  IncompleteBanner,
  KpiEmptyState,
  KpiErrorState,
  KpiLoadingSkeleton,
} from "@/components/kpis/kpi-states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adaptSummary, computeBenchmarks, filterKpis } from "@/lib/kpis/adapt";
import { buildAlerts } from "@/lib/kpis/alerts";
import { downloadCsv, kpisToCsv } from "@/lib/kpis/export";
import { defaultPeriod, periodFromRange } from "@/lib/kpis/period";
import { buildDashboardSummary, scoreByCategory, scoreKpis } from "@/lib/kpis/scoring";
import { templateById } from "@/lib/kpis/templates";
import { cn } from "@/lib/utils";
import type {
  ApiKpiDefinition,
  ApiSummaryItem,
  BranchOption,
  EmployeeOption,
  KpiFilters,
  RoleTemplateId,
  ReviewCycle,
} from "@/lib/kpis/types";

export function KpiDashboard() {
  const user = typeof window !== "undefined" ? getUser() : null;
  const isAdmin = user?.role === "tenant_admin";
  const initial = defaultPeriod("monthly");

  const [filters, setFilters] = useState<KpiFilters>({
    employeeId: user?.role === "employee" ? user.employeeId ?? "" : "",
    department: "",
    role: "",
    branchId: "",
    manager: "",
    cycle: "monthly",
    from: initial.from,
    to: initial.to,
    search: "",
    category: "",
    status: "",
  });
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [definitions, setDefinitions] = useState<ApiKpiDefinition[]>([]);
  const [summary, setSummary] = useState<ApiSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);

  async function load() {
    setError(null);
    const current = getUser();
    const admin = current?.role === "tenant_admin";
    const summaryRes = await api<{ summary: ApiSummaryItem[] }>("/v1/kpis/summary");
    setSummary(summaryRes.summary ?? []);

    if (admin) {
      const [kpisRes, empRes, branchRes] = await Promise.all([
        api<{ kpis: ApiKpiDefinition[] }>("/v1/kpis"),
        api<{ employees: EmployeeOption[] }>("/v1/employees"),
        api<{ branches: BranchOption[] }>("/v1/branches"),
      ]);
      setDefinitions(kpisRes.kpis ?? []);
      setEmployees(empRes.employees ?? []);
      setBranches(branchRes.branches ?? []);
      return;
    }

    try {
      const empRes = await api<{ employees: EmployeeOption[] }>("/v1/employees");
      setEmployees(
        empRes.employees.filter(
          (e) => !current?.employeeId || e.id === current.employeeId,
        ),
      );
    } catch {
      setEmployees([]);
    }
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patchFilters(patch: Partial<KpiFilters>) {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      if (patch.cycle && !patch.from && !patch.to) {
        const window = defaultPeriod(patch.cycle as ReviewCycle);
        next.from = window.from;
        next.to = window.to;
      }
      return next;
    });
  }

  const period = useMemo(
    () => periodFromRange(filters.cycle, filters.from, filters.to),
    [filters.cycle, filters.from, filters.to],
  );

  const allItems = useMemo(
    () => adaptSummary(summary, employees, period),
    [summary, employees, period],
  );

  const filtered = useMemo(
    () => filterKpis(allItems, employees, filters),
    [allItems, employees, filters],
  );

  const scored = useMemo(() => scoreKpis(filtered), [filtered]);
  const tableRows = useMemo(
    () => (filters.status ? scored.filter((k) => k.status === filters.status) : scored),
    [scored, filters.status],
  );
  const categories = useMemo(() => scoreByCategory(scored), [scored]);
  const alerts = useMemo(() => buildAlerts(scored), [scored]);
  const benchmarks = useMemo(
    () =>
      computeBenchmarks(
        scored,
        allItems,
        employees,
        filters.employeeId,
        filters.role,
      ),
    [scored, allItems, employees, filters.employeeId, filters.role],
  );
  const dashSummary = useMemo(
    () =>
      buildDashboardSummary(
        scored,
        benchmarks.previousPeriod,
        {
          percentile: benchmarks.percentile,
          rank: benchmarks.rank,
          cohortSize: benchmarks.cohortSize,
        },
        alerts.filter((a) => a.kind === "below_target" || a.kind === "missing_data").length,
      ),
    [scored, benchmarks, alerts],
  );

  const selected = scored.find((k) => k.id === selectedId) ?? null;
  const hasAssignments = filtered.length > 0;
  const hasActuals = scored.some((k) => !k.incomplete);
  const noTemplateForEmployee =
    Boolean(filters.employeeId) &&
    allItems.filter((i) => i.employeeId === filters.employeeId).length === 0;
  const showEmpty =
    noTemplateForEmployee ||
    (summary.length === 0 && definitions.length === 0) ||
    (!hasAssignments && summary.length === 0);

  function alreadyAssigned(kpiId: string, employeeId: string) {
    return summary.some(
      (row) =>
        row.assignment.employeeId === employeeId &&
        (row.assignment.kpiId === kpiId || row.kpi?.id === kpiId),
    );
  }

  async function assignKpi(kpiId: string, employeeId: string) {
    if (!employeeId) throw new Error("Choose a person first");
    if (alreadyAssigned(kpiId, employeeId)) return;
    await api("/v1/kpis/assign", {
      method: "POST",
      body: JSON.stringify({ kpiId, employeeId }),
    });
    await load();
  }

  async function createKpi(
    name: string,
    target: number,
    reviewPeriod: string,
    employeeId?: string,
  ) {
    const created = await api<{ kpi: ApiKpiDefinition }>("/v1/kpis", {
      method: "POST",
      body: JSON.stringify({
        name,
        type: "numeric",
        targetValue: target,
        reviewPeriod,
      }),
    });
    if (employeeId && created.kpi?.id) {
      await assignKpi(created.kpi.id, employeeId);
      return;
    }
    await load();
  }

  async function cloneKpi(id: string) {
    await api(`/v1/kpis/${id}/clone`, { method: "POST" });
    await load();
  }

  async function updateKpi(
    id: string,
    data: { name: string; targetValue: number; reviewPeriod: string },
  ) {
    await api(`/v1/kpis/${id}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: data.name,
        targetValue: data.targetValue,
        reviewPeriod: data.reviewPeriod,
      }),
    });
    await load();
  }

  async function deleteKpi(id: string) {
    await api(`/v1/kpis/${id}`, { method: "DELETE" });
    await load();
  }

  async function unassignKpi(assignmentId: string) {
    await api(`/v1/kpis/assignments/${assignmentId}`, { method: "DELETE" });
    await load();
  }

  async function applyTemplate(role: RoleTemplateId, employeeId: string) {
    const template = templateById(role);
    const existing = await api<{ kpis: ApiKpiDefinition[] }>("/v1/kpis");
    for (const kpi of template.kpis) {
      const found = existing.kpis.find(
        (d) => d.name.toLowerCase() === kpi.title.toLowerCase(),
      );
      let kpiId = found?.id;
      if (!kpiId) {
        const created = await api<{ kpi: ApiKpiDefinition }>("/v1/kpis", {
          method: "POST",
          body: JSON.stringify({
            name: kpi.title,
            type: "numeric",
            targetValue: kpi.targetValue,
            reviewPeriod: kpi.period === "yearly" ? "quarterly" : kpi.period,
            description: kpi.description,
          }),
        });
        kpiId = created.kpi.id;
        existing.kpis.push(created.kpi);
      }
      if (employeeId && kpiId) {
        const alreadyAssigned = summary.some(
          (row) =>
            row.assignment.employeeId === employeeId &&
            row.kpi?.name.toLowerCase() === kpi.title.toLowerCase(),
        );
        if (!alreadyAssigned) {
          await api("/v1/kpis/assign", {
            method: "POST",
            body: JSON.stringify({ kpiId, employeeId }),
          });
        }
      }
    }
    await load();
    setTemplateOpen(false);
  }

  async function recordScore(assignmentId: string, score: number, notes: string) {
    await api("/v1/kpis/scores", {
      method: "POST",
      body: JSON.stringify({
        assignmentId,
        score,
        notes: notes || null,
      }),
    });
    await load();
  }

  function exportCsv() {
    downloadCsv(`kpi-performance-${filters.from}-${filters.to}.csv`, kpisToCsv(tableRows));
  }

  if (loading) return <KpiLoadingSkeleton />;
  if (error)
    return (
      <KpiErrorState
        message={error}
        onRetry={() => {
          setLoading(true);
          load()
            .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
            .finally(() => setLoading(false));
        }}
      />
    );

  const topAlerts = alerts.filter(
    (a) => a.kind === "below_target" || a.kind === "missing_data",
  ).slice(0, 4);

  return (
    <div className="space-y-5">
      <KpiFiltersBar
        filters={filters}
        onChange={patchFilters}
        employees={isAdmin ? employees : employees.filter((e) => e.id === user?.employeeId)}
        branches={branches}
        isAdmin={isAdmin}
        onExport={exportCsv}
        onEditTemplate={() => setTemplateOpen(true)}
      />

      {showEmpty ? (
        <KpiEmptyState
          title={isAdmin ? "No one has KPIs yet" : "No KPIs assigned to you"}
          description={
            isAdmin
              ? "Set targets for a person, then enter how they actually did."
              : "When your manager assigns targets, they will show up here."
          }
          steps={
            isAdmin
              ? [
                  "Choose a person.",
                  "Assign a job pack, or add/assign any custom metric.",
                  "Open a metric and enter the result for this period.",
                ]
              : undefined
          }
          action={
            isAdmin ? (
              <Button onClick={() => setTemplateOpen(true)}>Set up KPIs</Button>
            ) : undefined
          }
        />
      ) : !hasAssignments ? (
        <KpiEmptyState
          title="Nothing matches these filters"
          description="Try Everyone, or clear More filters."
        />
      ) : (
        <>
          <KpiSummaryCards
            summary={dashSummary}
            teamAverage={benchmarks.teamAverage}
            hasActuals={hasActuals}
          />
          <IncompleteBanner count={dashSummary.incompleteCount} />

          {topAlerts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {topAlerts.map((alert) => (
                <button
                  key={alert.id}
                  type="button"
                  onClick={() => alert.kpiId && setSelectedId(alert.kpiId)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium ring-1",
                    alert.severity === "high"
                      ? "bg-rose-50 text-rose-800 ring-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-800"
                      : "bg-amber-50 text-amber-900 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-800",
                  )}
                >
                  {alert.title}
                </button>
              ))}
            </div>
          ) : null}

          <Tabs defaultValue="metrics">
            <TabsList className="max-w-md">
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="chart">Chart</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
            <TabsContent value="metrics" className="mt-4">
              <KpiMetricList items={scored} isAdmin={isAdmin} onOpen={setSelectedId} />
            </TabsContent>
            <TabsContent value="chart" className="mt-4">
              <KpiCharts
                items={scored}
                categories={categories}
                onSelect={setSelectedId}
                simple
              />
            </TabsContent>
            <TabsContent value="table" className="mt-4">
              <KpiTable
                items={tableRows}
                search={filters.search}
                onSearch={(search) => patchFilters({ search })}
                status={filters.status}
                onStatus={(status) => patchFilters({ status })}
                onOpen={setSelectedId}
                showEmployee={!filters.employeeId && isAdmin}
              />
            </TabsContent>
          </Tabs>
        </>
      )}

      <KpiDetailDrawer
        kpi={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        isAdmin={isAdmin}
        onRecordScore={recordScore}
      />

      {isAdmin ? (
        <KpiTemplateDialog
          open={templateOpen}
          onOpenChange={setTemplateOpen}
          definitions={definitions}
          employees={employees}
          selectedEmployeeId={filters.employeeId}
          onCreate={createKpi}
          onClone={cloneKpi}
          onAssign={assignKpi}
          onUpdate={updateKpi}
          onDelete={deleteKpi}
          onUnassign={unassignKpi}
          assignedPairs={summary
            .filter((row) => row.kpi && row.assignment.employeeId)
            .map((row) => ({
              kpiId: row.kpi!.id,
              employeeId: row.assignment.employeeId as string,
              assignmentId: row.assignment.id,
            }))}
          onApplyTemplate={applyTemplate}
        />
      ) : null}
    </div>
  );
}
