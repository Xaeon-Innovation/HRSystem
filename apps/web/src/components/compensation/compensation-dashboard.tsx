"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getUser, type AuthUser } from "@/lib/api";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { CompensationApprovalsPanel } from "@/components/compensation/compensation-approvals-panel";
import { CompensationChangeForm } from "@/components/compensation/compensation-change-form";
import { CompensationComponentsPanel } from "@/components/compensation/compensation-components-panel";
import { CompensationEmployeesTable } from "@/components/compensation/compensation-employees-table";
import { CompensationHeader } from "@/components/compensation/compensation-header";
import { CompensationHistoryPanel } from "@/components/compensation/compensation-history-panel";
import { CompensationOverviewCards } from "@/components/compensation/compensation-overview-cards";
import { CompensationOverviewPanel } from "@/components/compensation/compensation-overview-panel";
import { CompensationPaySetupForm } from "@/components/compensation/compensation-pay-setup-form";
import { CompensationPayrollPanel } from "@/components/compensation/compensation-payroll-panel";
import { CompensationProfileDrawer } from "@/components/compensation/compensation-profile-drawer";
import { CompensationReportsPanel } from "@/components/compensation/compensation-reports-panel";
import {
  CompAccessDenied,
  CompErrorState,
  CompLoadingSkeleton,
} from "@/components/compensation/compensation-states";
import { CompensationVariablePanel } from "@/components/compensation/compensation-variable-panel";
import { PrimaryTabBar } from "@/components/ui/primary-tab-bar";
import { Notice } from "@/components/elevora";
import {
  getCompensationStore,
  type CompActor,
  type CompensationPersistedSnapshot,
  type EmployeeFilters,
} from "@/lib/compensation";
import { isAdminActor } from "@/lib/compensation/workflow";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChangeStatusBadge } from "@/components/compensation/compensation-status-badge";
import { CompensationAuditTimeline } from "@/components/compensation/compensation-audit-timeline";
import {
  changeTypeLabel,
  formatDate,
  formatMoney,
} from "@/lib/compensation/format";
import { t } from "@/i18n";

type EmployeeOption = {
  id: string;
  name: string;
  email?: string | null;
  jobTitle?: string | null;
  role?: string;
  status?: string;
  hireDate?: string | null;
  branchId?: string | null;
};

type BranchOption = { id: string; name: string };

const EMPTY_FILTERS: EmployeeFilters = {
  search: "",
  department: "",
  branchId: "",
  payStructure: "",
  status: "",
  band: "all",
};

function actorFrom(user: AuthUser | null): CompActor {
  return {
    id: user?.id ?? "anonymous",
    name: user?.name ?? "You",
    role: user?.role ?? "employee",
    employeeId: user?.employeeId,
    systemModuleRoles: user?.systemModuleRoles ?? [],
  };
}

export function CompensationDashboard() {
  const store = getCompensationStore();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState("overview");
  const [filters, setFilters] = useState<EmployeeFilters>(EMPTY_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [formEmployeeId, setFormEmployeeId] = useState<string | null>(null);
  const [rateOpen, setRateOpen] = useState(false);
  const [rateEmployeeId, setRateEmployeeId] = useState<string | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const refresh = () => setTick((n) => n + 1);
  const actor = actorFrom(user);
  const isAdmin = isAdminActor(actor);
  const isManager = store.isManager(actor);
  const allowed = store.canAccess(actor);

  useEffect(() => {
    setUser(getUser());
    setLoading(true);
    setError(null);
    const current = getUser();
    const admin = isAdminActor(actorFrom(current));

    store.setRemotePersist((snapshot, expectedVersion) => {
      void api<{ compensation: CompensationPersistedSnapshot & { version?: number } }>(
        "/v1/compensation",
        {
          method: "PUT",
          body: JSON.stringify({ snapshot, expectedVersion }),
        },
      )
        .then((res) => {
          if (typeof res.compensation.version === "number") {
            store.setVersion(res.compensation.version);
          }
          setSaveError(null);
        })
        .catch((e) => {
          const msg =
            e instanceof Error ? e.message : "Could not save compensation data";
          setSaveError(
            msg.includes("updated elsewhere")
              ? `${msg} Reload the page to continue.`
              : msg,
          );
        });
    });

    Promise.all([
      api<{ compensation: CompensationPersistedSnapshot & { version?: number } }>(
        "/v1/compensation",
      ),
      admin
        ? api<{ employees: EmployeeOption[] }>("/v1/employees").catch(() => ({
            employees: [],
          }))
        : Promise.resolve({ employees: [] as EmployeeOption[] }),
      admin
        ? api<{ branches: BranchOption[] }>("/v1/branches").catch(() => ({
            branches: [],
          }))
        : Promise.resolve({ branches: [] as BranchOption[] }),
    ])
      .then(async ([compRes, empRes, branchRes]) => {
        store.replaceFromServer(compRes.compensation);
        store.hydrateDirectory({
          employees: empRes.employees,
          branches: branchRes.branches,
          current: actorFrom(current),
        });
        const period = store.period();
        if (admin) {
          const clocks = await api<{
            records: Array<{
              id: string;
              employeeId: string;
              clockInAt: string;
              clockOutAt: string | null;
            }>;
          }>(`/v1/attendance/period?from=${period.start}&to=${period.end}`).catch(
            () => ({
              records: [] as Array<{
                id: string;
                employeeId: string;
                clockInAt: string;
                clockOutAt: string | null;
              }>,
            }),
          );
          if (clocks.records.length > 0) {
            store.ingestClockHours(clocks.records);
          }
        }
        refresh();
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Failed to load compensation"),
      )
      .finally(() => setLoading(false));

    return () => {
      store.setRemotePersist(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const employees = useMemo(
    () => store.employees(actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id, actor.role, actor.employeeId],
  );
  const filtered = useMemo(
    () => store.filteredEmployees(filters, actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, filters, actor.id, actor.role],
  );
  const summary = useMemo(
    () => store.overview(actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id, actor.role],
  );
  const report = useMemo(
    () => store.report(actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id, actor.role],
  );
  const requests = useMemo(
    () => store.requests(actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, actor.id, actor.role],
  );
  const profile = profileId ? store.profile(profileId) : null;
  const selectedRequest = requestId ? store.request(requestId) : null;

  function run(action: () => void) {
    try {
      action();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (loading) return <CompLoadingSkeleton />;
  if (!allowed) return <CompAccessDenied />;
  if (error && employees.length === 0) {
    return (
      <CompErrorState
        message={error}
        onRetry={() => {
          setError(null);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <CompensationHeader
        isAdmin={isAdmin}
        isManager={isManager}
        preview={false}
        onNew={() => {
          setFormEmployeeId(null);
          setFormOpen(true);
        }}
        onHourly={() => {
          setRateEmployeeId(null);
          setRateOpen(true);
        }}
      />

      {error ? <Notice tone="warn">{error}</Notice> : null}
      {saveError ? (
        <Notice tone="warn">
          {t("Couldn’t save to server:")} {saveError}
        </Notice>
      ) : null}

      <CompensationOverviewCards summary={summary} />

      <Tabs value={tab} onValueChange={setTab}>
        <PrimaryTabBar
          value={tab}
          onValueChange={setTab}
          primaryCount={5}
          tabs={[
            { value: "overview", label: t("Overview") },
            { value: "employees", label: t("Employees") },
            { value: "history", label: t("History") },
            { value: "components", label: t("Allowances") },
            {
              value: "approvals",
              label: t("Approvals"),
              badge: summary.pendingApprovals,
            },
            { value: "variable", label: t("Bonus / commission") },
            { value: "payroll", label: t("Payroll inputs") },
            { value: "reports", label: t("Reports") },
          ]}
        />

        <TabsContent value="overview" className="mt-4">
          <CompensationOverviewPanel
            summary={summary}
            report={report}
            pending={requests.filter((r) => r.status === "pending")}
            recent={store.recentChanges(actor)}
            employees={employees}
            store={store}
            onOpenEmployee={setProfileId}
            onOpenRequest={setRequestId}
            onGoApprovals={() => setTab("approvals")}
          />
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <CompensationEmployeesTable
            employees={filtered}
            store={store}
            filters={filters}
            onChange={(patch) => setFilters((prev) => ({ ...prev, ...patch }))}
            onOpen={setProfileId}
          />
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <CompensationHistoryPanel
            history={store.history().filter((h) => employees.some((e) => e.id === h.employeeId))}
            employees={employees}
            onOpenEmployee={setProfileId}
          />
        </TabsContent>

        <TabsContent value="components" className="mt-4">
          <CompensationComponentsPanel
            components={store.components().filter((c) => employees.some((e) => e.id === c.employeeId))}
            employees={employees}
            store={store}
            actor={actor}
            isAdmin={isAdmin}
            onChanged={refresh}
            onOpenEmployee={setProfileId}
          />
        </TabsContent>

        <TabsContent value="variable" className="mt-4">
          <CompensationVariablePanel
            items={store.variable().filter((v) => employees.some((e) => e.id === v.employeeId))}
            employees={employees}
            store={store}
            actor={actor}
            isAdmin={isAdmin}
            onChanged={refresh}
            onOpenEmployee={setProfileId}
          />
        </TabsContent>

        <TabsContent value="approvals" className="mt-4">
          <CompensationApprovalsPanel
            requests={requests}
            isAdmin={isAdmin}
            onOpenEmployee={setProfileId}
            onApprove={(id, note) => run(() => store.decide(id, "approved", actor, note))}
            onReject={(id, note) => run(() => store.decide(id, "rejected", actor, note))}
            onReturn={(id, note) => run(() => store.decide(id, "returned", actor, note))}
            onSelect={setRequestId}
          />
        </TabsContent>

        <TabsContent value="payroll" className="mt-4">
          <CompensationPayrollPanel
            rows={store.payrollRows(actor)}
            period={store.period()}
            isAdmin={isAdmin}
            onOpenEmployee={setProfileId}
            onManualAdjust={(employeeId, amount, note) =>
              run(() => store.setManualAdjustment(employeeId, amount, note, actor))
            }
          />
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <CompensationReportsPanel
            report={report}
            summary={summary}
            employees={employees}
            onOpenEmployee={setProfileId}
          />
        </TabsContent>
      </Tabs>

      <CompensationChangeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        store={store}
        actor={actor}
        employees={employees}
        presetEmployeeId={formEmployeeId}
        onSubmitted={refresh}
      />

      <CompensationPaySetupForm
        open={rateOpen}
        onOpenChange={setRateOpen}
        store={store}
        actor={actor}
        employees={employees}
        presetEmployeeId={rateEmployeeId}
        onSaved={refresh}
      />

      <CompensationProfileDrawer
        profile={profile}
        store={store}
        open={Boolean(profile)}
        onOpenChange={(open) => {
          if (!open) setProfileId(null);
        }}
        canPropose={isAdmin || isManager}
        canEditRate={isAdmin}
        onPropose={(id) => {
          setProfileId(null);
          setFormEmployeeId(id);
          setFormOpen(true);
        }}
        onSetHourly={(id) => {
          setProfileId(null);
          setRateEmployeeId(id);
          setRateOpen(true);
        }}
      />

      <Sheet
        open={Boolean(selectedRequest)}
        onOpenChange={(open) => {
          if (!open) setRequestId(null);
        }}
      >
        <SheetContent className="max-w-lg">
          {selectedRequest ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedRequest.employeeName}</SheetTitle>
                <SheetDescription>
                  {changeTypeLabel(selectedRequest.changeType)} {t("· effective")}{" "}
                  {formatDate(selectedRequest.effectiveDate)}
                </SheetDescription>
              </SheetHeader>
              <SheetBody className="space-y-4">
                <ChangeStatusBadge status={selectedRequest.status} />
                <p className="text-sm">
                  {formatMoney(selectedRequest.previousAmount, selectedRequest.currency)} →{" "}
                  {formatMoney(selectedRequest.newAmount, selectedRequest.currency)}
                </p>
                <p className="text-sm">{selectedRequest.reason}</p>
                {selectedRequest.justification ? (
                  <p className="text-sm text-ink-muted">{selectedRequest.justification}</p>
                ) : null}
                {selectedRequest.decisionNote ? (
                  <p className="rounded-lg bg-surface-2/70 px-3 py-2 text-sm">
                    {selectedRequest.decisionNote}
                  </p>
                ) : null}
                <CompensationAuditTimeline events={selectedRequest.audit} />
              </SheetBody>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
