"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getUser } from "@/lib/api";
import { userHasModule } from "@/lib/permissions";
import { KpiFiltersBar } from "@/components/kpis/kpi-filters";
import {
  KpiSummaryCards,
  type KpiDrillFocus,
} from "@/components/kpis/kpi-summary-cards";
import { KpiCharts } from "@/components/kpis/kpi-charts";
import { KpiMetricList } from "@/components/kpis/kpi-metric-list";
import { KpiDetailDrawer } from "@/components/kpis/kpi-detail-drawer";
import { KpiTemplateDialog } from "@/components/kpis/kpi-template-dialog";
import { KpiPeopleQueue } from "@/components/kpis/kpi-people-queue";
import { KpiPersonScorecard } from "@/components/kpis/kpi-person-scorecard";
import { KpiMePanel } from "@/components/kpis/kpi-me-panel";
import { KpiBenchmarks } from "@/components/kpis/kpi-benchmarks";
import { PerformanceReportsPanel } from "@/components/kpis/performance-reports-panel";
import {
  KpiEmptyState,
  KpiErrorState,
  KpiLoadingSkeleton,
} from "@/components/kpis/kpi-states";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { PrimaryTabBar } from "@/components/ui/primary-tab-bar";
import { PageHeader } from "@/components/elevora";
import { adaptSummary, computeBenchmarks, filterKpis } from "@/lib/kpis/adapt";
import { buildAlerts } from "@/lib/kpis/alerts";
import { downloadCsv, kpisToCsv } from "@/lib/kpis/export";
import { buildPeopleQueue } from "@/lib/kpis/people";
import { defaultPeriod, periodFromRange } from "@/lib/kpis/period";
import { buildDashboardSummary, scoreByCategory, scoreKpis } from "@/lib/kpis/scoring";
import { templateById } from "@/lib/kpis/templates";
import type {
  ApiKpiDefinition,
  ApiSummaryItem,
  BranchOption,
  EmployeeOption,
  KpiFilters,
  RoleTemplateId,
  ReviewCycle,
} from "@/lib/kpis/types";
import { t } from "@/i18n";

export function KpiDashboard() {
  const user = typeof window !== "undefined" ? getUser() : null;
  const isAdmin = userHasModule(user, "kpis");
  const initial = defaultPeriod("monthly");

  const [filters, setFilters] = useState<KpiFilters>({
    employeeId: !isAdmin ? user?.employeeId ?? "" : "",
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
  const [personId, setPersonId] = useState<string | null>(null);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState("people");
  const [drillFocus, setDrillFocus] = useState<KpiDrillFocus | "">("");
  const [actualsBusy, setActualsBusy] = useState(false);
  const [actualsMsg, setActualsMsg] = useState<string | null>(null);

  async function load() {
    setError(null);
    const current = getUser();
    const admin = userHasModule(current, "kpis");
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

  async function pullAttendanceActuals() {
    setActualsBusy(true);
    setActualsMsg(null);
    try {
      const res = await api<{ created: number; skipped: number }>(
        "/v1/kpis/auto-actuals",
        { method: "POST", body: "{}" },
      );
      setActualsMsg(
        `Pulled ${res.created} attendance actual${res.created === 1 ? "" : "s"}${
          res.skipped ? ` (${res.skipped} skipped)` : ""
        }.`,
      );
      await load();
    } catch (e) {
      setActualsMsg(
        e instanceof Error ? e.message : "Could not pull attendance actuals",
      );
    } finally {
      setActualsBusy(false);
    }
  }

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
  const drillFiltered = useMemo(() => {
    if (!drillFocus) return scored;
    if (drillFocus === "attention") {
      return scored.filter(
        (k) =>
          k.status === "below_target" ||
          k.status === "at_risk" ||
          k.status === "missing" ||
          k.incomplete,
      );
    }
    if (drillFocus === "on_track") {
      return scored.filter(
        (k) => k.status === "on_track" || k.status === "exceeded",
      );
    }
    return scored.filter((k) => k.status === "missing" || k.incomplete);
  }, [scored, drillFocus]);

  const tableRows = useMemo(
    () =>
      filters.status
        ? drillFiltered.filter((k) => k.status === filters.status)
        : drillFiltered,
    [drillFiltered, filters.status],
  );

  const people = useMemo(
    () => buildPeopleQueue(scored, employees, drillFocus),
    [scored, employees, drillFocus],
  );

  const selectedPerson = useMemo(
    () => people.find((p) => p.employeeId === personId) ?? null,
    [people, personId],
  );

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
        alerts.filter((a) => a.kind === "below_target" || a.kind === "missing_data")
          .length,
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

  const pendingAckIds = useMemo(
    () =>
      scored
        .filter((m) => m.latestScoreId && !m.acknowledgedAt && !m.incomplete)
        .map((m) => m.latestScoreId!),
    [scored],
  );

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
        const already = summary.some(
          (row) =>
            row.assignment.employeeId === employeeId &&
            row.kpi?.name.toLowerCase() === kpi.title.toLowerCase(),
        );
        if (!already) {
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

  async function acknowledgeScores(scoreIds: string[]) {
    if (scoreIds.length === 0) return;
    await api("/v1/kpis/scores/acknowledge", {
      method: "POST",
      body: JSON.stringify({ scoreIds }),
    });
    await load();
  }

  function exportCsv() {
    downloadCsv(
      `kpi-performance-${filters.from}-${filters.to}.csv`,
      kpisToCsv(tableRows),
    );
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

  function toggleDrill(focus: KpiDrillFocus) {
    setDrillFocus((prev) => (prev === focus ? "" : focus));
    setView("people");
  }

  const drillLabel =
    drillFocus === "attention"
      ? "Need a look"
      : drillFocus === "on_track"
        ? "Hit target"
        : drillFocus === "missing"
          ? "Incomplete"
          : null;

  const employeeSelf = !isAdmin;

  return (
    <div className="space-y-6">
      <PageHeader
        title={employeeSelf ? t("My performance") : t("Performance")}
        subtitle={
          employeeSelf
            ? t("Your overall score, what needs attention, and your metrics.")
            : t("Team pulse first, open a person to coach. Metrics and insights are one tap away.")
        }
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              {filtersOpen ? t("Hide filters") : t("Filters")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={exportCsv}
            >
              {t("Export")}
            </Button>
            {isAdmin ? (
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setTemplateOpen(true)}
              >
                {t("Set up KPIs")}
              </Button>
            ) : null}
          </>
        }
      />

      {filtersOpen ? (
        <KpiFiltersBar
          filters={filters}
          onChange={patchFilters}
          employees={
            isAdmin
              ? employees
              : employees.filter((e) => e.id === user?.employeeId)
          }
          branches={branches}
          isAdmin={isAdmin}
          onExport={exportCsv}
          onEditTemplate={() => setTemplateOpen(true)}
          hideHeader
        />
      ) : null}

      {showEmpty ? (
        <KpiEmptyState
          title={isAdmin ? t("No one has KPIs yet") : t("No KPIs assigned to you")}
          description={
            isAdmin
              ? t("Assign a job pack to someone, then enter results each period.")
              : t("When your manager assigns targets, they will show up here.")
          }
          steps={
            isAdmin
              ? [
                  t("Open Set up KPIs."),
                  t("Pick a person and apply a job pack (or add a custom metric)."),
                  t("Enter results from their scorecard or a metric detail."),
                ]
              : undefined
          }
          action={
            isAdmin ? (
              <Button onClick={() => setTemplateOpen(true)}>{t("Set up KPIs")}</Button>
            ) : undefined
          }
        />
      ) : !hasAssignments ? (
        <KpiEmptyState
          title={t("Nothing matches these filters")}
          description={t("Try Everyone, or clear More filters.")}
        />
      ) : (
        <>
          <KpiSummaryCards
            summary={dashSummary}
            teamAverage={isAdmin ? benchmarks.teamAverage : null}
            hasActuals={hasActuals}
            periodLabel={period.label}
            activeFocus={drillFocus}
            onDrill={toggleDrill}
          />

          {drillLabel ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {t("Showing:")}{drillLabel} ({people.length} {t("people)")}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => setDrillFocus("")}
              >
                {t("Clear")}</Button>
            </div>
          ) : null}

          {employeeSelf && pendingAckIds.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-sm border border-accent/30 bg-accent-tint px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm">
                <span className="font-medium">{pendingAckIds.length}</span> {t("new result")}{pendingAckIds.length === 1 ? "" : "s"} {t("waiting for your acknowledgement.")}</p>
              <Button
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => void acknowledgeScores(pendingAckIds)}
              >
                {t("Got it, acknowledge all")}</Button>
            </div>
          ) : null}

          <Tabs value={view} onValueChange={setView}>
            <PrimaryTabBar
              value={view}
              onValueChange={setView}
              primaryCount={4}
              tabs={[
                {
                  value: "people",
                  label: employeeSelf ? t("Me") : t("People"),
                  badge: people.length,
                },
                {
                  value: "metrics",
                  label: t("Metrics"),
                  badge: drillFiltered.length,
                },
                { value: "insights", label: t("Insights") },
                { value: "reports", label: t("Reports") },
              ]}
            />
            <TabsContent value="people" className="mt-4">
              {employeeSelf && people[0] ? (
                <KpiMePanel
                  person={people[0]}
                  periodLabel={period.label}
                  onOpenMetric={setSelectedId}
                  onOpenScorecard={() => setPersonId(people[0]!.employeeId)}
                  onAcknowledge={acknowledgeScores}
                />
              ) : (
                <KpiPeopleQueue
                  people={people}
                  selectedId={personId}
                  onSelect={(id) => setPersonId(id)}
                />
              )}
            </TabsContent>
            <TabsContent value="metrics" className="mt-4">
              {drillFiltered.length === 0 && drillFocus ? (
                <p className="text-sm text-ink-muted">
                  {t("Nothing in this slice. Clear the filter or adjust Filters.")}
                </p>
              ) : (
                <KpiMetricList
                  items={drillFiltered}
                  isAdmin={isAdmin}
                  onOpen={setSelectedId}
                />
              )}
            </TabsContent>
            <TabsContent value="insights" className="mt-4 space-y-4">
              {isAdmin ? (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-ink-muted">
                    Fill attendance-like KPI scores from this month&apos;s
                    clock-ins when missing.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    disabled={actualsBusy}
                    onClick={() => void pullAttendanceActuals()}
                  >
                    {actualsBusy
                      ? t("Pulling…")
                      : t("Pull attendance actuals")}
                  </Button>
                </div>
              ) : null}
              {actualsMsg ? (
                <p className="text-sm text-ink-muted">{actualsMsg}</p>
              ) : null}
              <KpiCharts
                items={drillFiltered}
                categories={scoreByCategory(drillFiltered)}
                onSelect={setSelectedId}
              />
              <KpiBenchmarks
                overall={dashSummary.overallPerformanceScore}
                benchmarks={benchmarks}
              />
            </TabsContent>
            <TabsContent value="reports" className="mt-4">
              <PerformanceReportsPanel
                employees={
                  employeeSelf && user?.employeeId
                    ? employees.filter((e) => e.id === user.employeeId)
                    : employees
                }
                isAdmin={isAdmin}
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
        onAcknowledge={
          !isAdmin
            ? async (scoreId) => acknowledgeScores([scoreId])
            : undefined
        }
      />

      <KpiPersonScorecard
        person={selectedPerson}
        open={Boolean(personId)}
        onOpenChange={(open) => {
          if (!open) setPersonId(null);
        }}
        allItems={allItems}
        employees={employees}
        isAdmin={isAdmin}
        onOpenMetric={(id) => {
          setSelectedId(id);
        }}
        onAcknowledge={!isAdmin ? acknowledgeScores : undefined}
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
          onPullActuals={pullAttendanceActuals}
        />
      ) : null}
    </div>
  );
}
