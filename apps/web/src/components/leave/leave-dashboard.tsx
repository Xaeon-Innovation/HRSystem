"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, getUser, type AuthUser } from "@/lib/api";
import { userHasModule } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TEXTAREA_CLASS } from "@/lib/leave/format";
import { LeaveBalancesTable } from "@/components/leave/leave-balances-table";
import { LeaveCalendarView } from "@/components/leave/leave-calendar-view";
import { LeaveHeader } from "@/components/leave/leave-header";
import { LeavePoliciesPanel } from "@/components/leave/leave-policies-panel";
import { LeaveReportsPanel } from "@/components/leave/leave-reports-panel";
import { LeaveRequestDetailDrawer } from "@/components/leave/leave-request-detail-drawer";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { LeaveRequestRail } from "@/components/leave/leave-request-rail";
import { LeaveRequestsTable } from "@/components/leave/leave-requests-table";
import { LeaveErrorState, LeaveLoadingSkeleton } from "@/components/leave/leave-states";
import { LeaveSubNav, type LeaveSection } from "@/components/leave/leave-sub-nav";
import { Notice, Segmented } from "@/components/elevora";
import {
  LeaveStore,
  actorCanActOnStep,
  currentApprovalStep,
  type LeaveActor,
  type LeaveBalance,
  type LeaveEmployee,
  type LeaveRequest,
  type LeaveRequestDraft,
  type LeaveRequestFilters,
  type LeaveSnapshot,
  type LeaveType,
} from "@/lib/leave";
import { useRouter } from "next/navigation";
import { t } from "@/i18n";

const EMPTY_FILTERS: LeaveRequestFilters = {
  search: "",
  status: "",
  leaveTypeId: "",
  employeeId: "",
  department: "",
  branchId: "",
  managerId: "",
  from: "",
  to: "",
};

function actorFrom(user: AuthUser | null): LeaveActor {
  return {
    id: user?.id ?? "anonymous",
    name: user?.name ?? "You",
    role: user?.role ?? "employee",
    employeeId: user?.employeeId,
    systemModuleRoles: user?.systemModuleRoles ?? [],
  };
}

export function LeaveDashboard({ section }: { section?: LeaveSection }) {
  const router = useRouter();
  const split = Boolean(section);
  const storeRef = useRef(new LeaveStore());
  const store = storeRef.current;
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [filters, setFilters] = useState<LeaveRequestFilters>(EMPTY_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [accrualMsg, setAccrualMsg] = useState<string | null>(null);
  const [tab, setTab] = useState("requests");
  const [busy, setBusy] = useState(false);

  const refresh = () => setTick((n) => n + 1);
  const actor = actorFrom(user);
  const isAdmin = userHasModule(user, "leaves");

  useEffect(() => {
    if (split && section === "policies" && !loading && user && !isAdmin) {
      router.replace("/app/leave");
    }
  }, [split, section, loading, user, isAdmin, router]);

  function applyLeave(leave: LeaveSnapshot) {
    store.applySnapshot(leave);
    refresh();
  }

  useEffect(() => {
    setUser(getUser());
    setLoading(true);
    setError(null);
    api<{ leave: LeaveSnapshot }>("/v1/leave")
      .then((res) => {
        applyLeave(res.leave);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load leave"))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requests = useMemo(
    () => store.requests(filters, actor),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, filters, actor.id, actor.role, actor.employeeId],
  );
  const employees = store.employees();
  const types = store.types();
  const policies = store.policies();
  const summary = store.reports();
  const selected = selectedId ? store.request(selectedId) : null;
  const editing = editingId ? store.request(editingId) : null;
  const annualId = types.find((t) => t.code === "annual")?.id;
  const myAnnual =
    actor.employeeId && annualId ? store.balance(actor.employeeId, annualId) : undefined;
  const viewerBalances = isAdmin
    ? store.balancesFor()
    : actor.employeeId
      ? store.balancesFor(actor.employeeId)
      : [];
  const managerPending = useMemo(
    () =>
      !isAdmin && actor.employeeId
        ? requests.filter(
            (r) =>
              r.status === "pending" &&
              (r.managerId === actor.employeeId ||
                actorCanActOnStep(actor, currentApprovalStep(r))),
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick, requests, isAdmin, actor.employeeId, actor.id],
  );
  const inbox = isAdmin ? store.inboxAlerts() : managerPending.map((request) => ({
    request,
    reminder: false,
    escalation: false,
  }));
  const reminderCount = inbox.filter((i) => i.reminder || i.escalation).length;

  function patchFilters(patch: Partial<LeaveRequestFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <LeaveLoadingSkeleton />;
  if (error && employees.length === 0) {
    return (
      <LeaveErrorState
        message={error}
        onRetry={() => {
          setError(null);
          setLoading(true);
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <LeaveHeader
        isAdmin={isAdmin}
        onNew={() => {
          setEditingId(null);
          setFormOpen(true);
        }}
      />

      {error ? <Notice tone="warn">{error}</Notice> : null}

      {reminderCount > 0 && isAdmin ? (
        <Notice tone="warn">
          {reminderCount} {t("pending request")}{reminderCount === 1 ? "" : "s"}{" "}
          {t("past the reminder or escalation window.")}
        </Notice>
      ) : null}

      {managerPending.length > 0 ? (
        <Notice tone="accent">
          <p className="font-semibold text-ink">{t("Team leave to approve")}</p>
          <p className="mt-0.5 text-ink-muted">
            {managerPending.length} {t("request")}{managerPending.length === 1 ? "" : "s"}{" "}
            {t("waiting on you as manager.")}
          </p>
        </Notice>
      ) : null}

      {split ? <LeaveSubNav isAdmin={isAdmin} /> : null}

      {!split ? (
      <div className="space-y-4">
        <div className="max-w-full overflow-x-auto">
          <Segmented
            className="w-max"
            aria-label={t("Leave sections")}
            value={tab}
            onChange={setTab}
            options={[
              { value: "requests", label: t("Requests") },
              { value: "balances", label: t("Balances") },
              { value: "calendar", label: t("Calendar") },
              ...(isAdmin
                ? [{ value: "policies", label: t("Policies") }]
                : []),
              { value: "reports", label: t("Reports") },
            ]}
          />
        </div>

        {tab === "requests" ? (
          <RequestsRailBody
            isAdmin={isAdmin}
            selectedIds={selectedIds}
            busy={busy}
            requests={requests}
            filters={filters}
            patchFilters={patchFilters}
            employees={employees}
            types={types}
            actor={actor}
            store={store}
            annualBalance={myAnnual}
            annualType={types.find((lt) => lt.id === annualId)}
            onBulkApprove={() =>
              void run(async () => {
                const res = await api<{ leave: LeaveSnapshot }>("/v1/leave/requests/bulk-decide", {
                  method: "POST",
                  body: JSON.stringify({
                    ids: selectedIds,
                    decision: "approved",
                    comment: t("Bulk approved"),
                  }),
                });
                applyLeave(res.leave);
                setSelectedIds([]);
              })
            }
            onBulkReject={() => {
              const first = selectedIds[0];
              if (first) setRejectId(first);
            }}
            onClearSelect={() => setSelectedIds([])}
            onOpen={setSelectedId}
            onQuickApprove={(id) =>
              void run(async () => {
                const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/requests/${id}/decide`, {
                  method: "POST",
                  body: JSON.stringify({ decision: "approved", comment: t("Approved") }),
                });
                applyLeave(res.leave);
              })
            }
            onQuickReject={(id) => setRejectId(id)}
            onToggleSelect={(id, selectedNow) =>
              setSelectedIds((prev) =>
                selectedNow ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
              )
            }
            onRailSubmit={async (draft) => {
              const res = await api<{ leave: LeaveSnapshot }>("/v1/leave/requests", {
                method: "POST",
                body: JSON.stringify(draft),
              });
              applyLeave(res.leave);
            }}
            onOpenFullForm={() => {
              setEditingId(null);
              setFormOpen(true);
            }}
          />
        ) : null}

        {tab === "balances" ? (
          <LeaveBalancesTable
            balances={viewerBalances}
            employees={employees}
            types={types}
            transactions={store.transactions()}
            isAdmin={isAdmin}
            onAdjust={(employeeId, leaveTypeId, amount, note) =>
              void run(async () => {
                const res = await api<{ leave: LeaveSnapshot }>("/v1/leave/balances/adjust", {
                  method: "POST",
                  body: JSON.stringify({ employeeId, leaveTypeId, amount, note }),
                });
                applyLeave(res.leave);
              })
            }
          />
        ) : null}

        {tab === "calendar" ? (
          <LeaveCalendarView
            events={store.calendar()}
            employees={employees}
            policies={policies}
            requests={store.requests(undefined, isAdmin ? actor : actor)}
            onOpen={setSelectedId}
          />
        ) : null}

        {isAdmin && tab === "policies" ? (
            <LeavePoliciesPanel
              types={types}
              policies={policies}
              notifications={store.notifications()}
              onTypeChange={(id, patch) =>
                void run(async () => {
                  const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/types/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify(patch),
                  });
                  applyLeave(res.leave);
                })
              }
              onPolicyChange={(id, patch) =>
                void run(async () => {
                  const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/policies/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify(patch),
                  });
                  applyLeave(res.leave);
                })
              }
              onNotificationChange={(event, patch) =>
                void run(async () => {
                  store.updateNotification(event, patch);
                  refresh();
                })
              }
              onRunAccrual={() =>
                void run(async () => {
                  const res = await api<{ posted: number; leave: LeaveSnapshot }>("/v1/leave/accrual", {
                    method: "POST",
                  });
                  applyLeave(res.leave);
                  setAccrualMsg(
                    res.posted === 0
                      ? t("No accruals due, already posted for this period.")
                      : `Posted ${res.posted} accrual transaction${res.posted === 1 ? "" : "s"}.`,
                  );
                })
              }
              lastPosted={accrualMsg}
            />
        ) : null}

        {tab === "reports" ? (
          <LeaveReportsPanel summary={summary} requests={store.requests(undefined, actor)} />
        ) : null}
      </div>
      ) : (
        <div className="space-y-3">
          {section === "requests" ? (
            <RequestsRailBody
              isAdmin={isAdmin}
              selectedIds={selectedIds}
              busy={busy}
              requests={requests}
              filters={filters}
              patchFilters={patchFilters}
              employees={employees}
              types={types}
              actor={actor}
              store={store}
              annualBalance={myAnnual}
              annualType={types.find((lt) => lt.id === annualId)}
              onBulkApprove={() =>
                void run(async () => {
                  const res = await api<{ leave: LeaveSnapshot }>("/v1/leave/requests/bulk-decide", {
                    method: "POST",
                    body: JSON.stringify({
                      ids: selectedIds,
                      decision: "approved",
                      comment: t("Bulk approved"),
                    }),
                  });
                  applyLeave(res.leave);
                  setSelectedIds([]);
                })
              }
              onBulkReject={() => {
                const first = selectedIds[0];
                if (first) setRejectId(first);
              }}
              onClearSelect={() => setSelectedIds([])}
              onOpen={setSelectedId}
              onQuickApprove={(id) =>
                void run(async () => {
                  const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/requests/${id}/decide`, {
                    method: "POST",
                    body: JSON.stringify({ decision: "approved", comment: t("Approved") }),
                  });
                  applyLeave(res.leave);
                })
              }
              onQuickReject={(id) => setRejectId(id)}
              onToggleSelect={(id, selectedNow) =>
                setSelectedIds((prev) =>
                  selectedNow ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
                )
              }
              onRailSubmit={async (draft) => {
                const res = await api<{ leave: LeaveSnapshot }>("/v1/leave/requests", {
                  method: "POST",
                  body: JSON.stringify(draft),
                });
                applyLeave(res.leave);
              }}
              onOpenFullForm={() => {
                setEditingId(null);
                setFormOpen(true);
              }}
            />
          ) : null}
          {section === "balances" ? (
            <LeaveBalancesTable
              balances={viewerBalances}
              employees={employees}
              types={types}
              transactions={store.transactions()}
              isAdmin={isAdmin}
              onAdjust={(employeeId, leaveTypeId, amount, note) =>
                void run(async () => {
                  const res = await api<{ leave: LeaveSnapshot }>("/v1/leave/balances/adjust", {
                    method: "POST",
                    body: JSON.stringify({ employeeId, leaveTypeId, amount, note }),
                  });
                  applyLeave(res.leave);
                })
              }
            />
          ) : null}
          {section === "calendar" ? (
            <LeaveCalendarView
              events={store.calendar()}
              employees={employees}
              policies={policies}
              requests={store.requests(undefined, isAdmin ? actor : actor)}
              onOpen={setSelectedId}
            />
          ) : null}
          {section === "policies" && isAdmin ? (
            <LeavePoliciesPanel
              types={types}
              policies={policies}
              notifications={store.notifications()}
              onTypeChange={(id, patch) =>
                void run(async () => {
                  const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/types/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify(patch),
                  });
                  applyLeave(res.leave);
                })
              }
              onPolicyChange={(id, patch) =>
                void run(async () => {
                  const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/policies/${id}`, {
                    method: "PATCH",
                    body: JSON.stringify(patch),
                  });
                  applyLeave(res.leave);
                })
              }
              onNotificationChange={(event, patch) =>
                void run(async () => {
                  store.updateNotification(event, patch);
                  refresh();
                })
              }
              onRunAccrual={() =>
                void run(async () => {
                  const res = await api<{ posted: number; leave: LeaveSnapshot }>("/v1/leave/accrual", {
                    method: "POST",
                  });
                  applyLeave(res.leave);
                  setAccrualMsg(
                    res.posted === 0
                      ? t("No accruals due, already posted for this period.")
                      : `Posted ${res.posted} accrual transaction${res.posted === 1 ? "" : "s"}.`,
                  );
                })
              }
              lastPosted={accrualMsg}
            />
          ) : null}
          {section === "reports" ? (
            <LeaveReportsPanel summary={summary} requests={store.requests(undefined, actor)} />
          ) : null}
        </div>
      )}

      <LeaveRequestForm
        key={`${formOpen}-${editingId ?? "new"}`}
        open={formOpen}
        onOpenChange={setFormOpen}
        store={store}
        actor={actor}
        isAdmin={isAdmin}
        editing={editing}
        busy={busy}
        onSave={async (draft, editingRequestId) => {
          const path = editingRequestId
            ? `/v1/leave/requests/${editingRequestId}/resubmit`
            : "/v1/leave/requests";
          const res = await api<{ leave: LeaveSnapshot }>(path, {
            method: "POST",
            body: JSON.stringify(draft),
          });
          applyLeave(res.leave);
        }}
      />

      <LeaveRequestDetailDrawer
        request={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        isAdmin={isAdmin}
        actor={actor}
        balanceRemaining={
          selected ? store.balance(selected.employeeId, selected.leaveTypeId)?.remaining ?? null : null
        }
        balancePending={
          selected ? store.balance(selected.employeeId, selected.leaveTypeId)?.pending ?? null : null
        }
        onApprove={(id, comment) =>
          void run(async () => {
            const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/requests/${id}/decide`, {
              method: "POST",
              body: JSON.stringify({ decision: "approved", comment }),
            });
            applyLeave(res.leave);
          })
        }
        onReject={(id, reason) =>
          void run(async () => {
            const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/requests/${id}/decide`, {
              method: "POST",
              body: JSON.stringify({ decision: "rejected", comment: reason }),
            });
            applyLeave(res.leave);
          })
        }
        onReturn={(id, comment) =>
          void run(async () => {
            const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/requests/${id}/decide`, {
              method: "POST",
              body: JSON.stringify({ decision: "returned", comment }),
            });
            applyLeave(res.leave);
          })
        }
        onCancel={(id, note) =>
          void run(async () => {
            const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/requests/${id}/cancel`, {
              method: "POST",
              body: JSON.stringify({ note }),
            });
            applyLeave(res.leave);
          })
        }
        onComment={(id, body) =>
          void run(async () => {
            const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/requests/${id}/comments`, {
              method: "POST",
              body: JSON.stringify({
                body,
                kind: isAdmin ? "approver" : "employee",
              }),
            });
            applyLeave(res.leave);
          })
        }
        onHrNote={(id, note) =>
          void run(async () => {
            const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/requests/${id}/hr-note`, {
              method: "PATCH",
              body: JSON.stringify({ note }),
            });
            applyLeave(res.leave);
          })
        }
        onEdit={(id) => {
          setSelectedId(null);
          setEditingId(id);
          setFormOpen(true);
        }}
      />

      <ConfirmDialog
        open={Boolean(rejectId)}
        title={t("Reject leave request")}
        description="A written reason is required. The employee balance will not change."
        confirmLabel="Reject"
        variant="destructive"
        busy={busy}
        onConfirm={async () => {
          if (!rejectId || !rejectReason.trim()) return;
          const reason = rejectReason.trim();
          const bulk = selectedIds.length > 1 && selectedIds.includes(rejectId);
          await run(async () => {
            if (bulk) {
              const res = await api<{ leave: LeaveSnapshot }>("/v1/leave/requests/bulk-decide", {
                method: "POST",
                body: JSON.stringify({
                  ids: selectedIds,
                  decision: "rejected",
                  comment: reason,
                }),
              });
              applyLeave(res.leave);
              setSelectedIds([]);
            } else {
              const res = await api<{ leave: LeaveSnapshot }>(
                `/v1/leave/requests/${rejectId}/decide`,
                {
                  method: "POST",
                  body: JSON.stringify({ decision: "rejected", comment: reason }),
                },
              );
              applyLeave(res.leave);
            }
          });
          setRejectId(null);
          setRejectReason("");
        }}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setRejectId(null);
            setRejectReason("");
          }
        }}
      >
        <textarea
          className={`${TEXTAREA_CLASS} mt-3`}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder={t("Why this request is being declined")}
        />
      </ConfirmDialog>
    </div>
  );
}

function RequestsRailBody({
  isAdmin,
  selectedIds,
  busy,
  requests,
  filters,
  patchFilters,
  employees,
  types,
  actor,
  store,
  annualBalance,
  annualType,
  onBulkApprove,
  onBulkReject,
  onClearSelect,
  onOpen,
  onQuickApprove,
  onQuickReject,
  onToggleSelect,
  onRailSubmit,
  onOpenFullForm,
}: {
  isAdmin: boolean;
  selectedIds: string[];
  busy: boolean;
  requests: LeaveRequest[];
  filters: LeaveRequestFilters;
  patchFilters: (patch: Partial<LeaveRequestFilters>) => void;
  employees: LeaveEmployee[];
  types: LeaveType[];
  actor: LeaveActor;
  store: LeaveStore;
  annualBalance?: LeaveBalance;
  annualType?: LeaveType;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  onClearSelect: () => void;
  onOpen: (id: string) => void;
  onQuickApprove: (id: string) => void;
  onQuickReject: (id: string) => void;
  onToggleSelect: (id: string, selected: boolean) => void;
  onRailSubmit: (draft: LeaveRequestDraft) => Promise<void>;
  onOpenFullForm: () => void;
}) {
  return (
    <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(240px,300px)]">
      <div className="min-w-0 space-y-3">
        {isAdmin && selectedIds.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-sm border border-line bg-surface px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center">
            <p className="text-sm">{selectedIds.length} {t("selected")}</p>
            <Button size="sm" className="w-full sm:w-auto" disabled={busy} onClick={onBulkApprove}>
              {t("Approve selected")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onBulkReject}
            >
              {t("Reject selected")}
            </Button>
            <Button size="sm" variant="ghost" className="w-full sm:w-auto" onClick={onClearSelect}>
              {t("Clear")}
            </Button>
          </div>
        ) : null}
        <LeaveRequestsTable
          requests={requests}
          filters={filters}
          onChange={patchFilters}
          employees={employees}
          types={types}
          isAdmin={isAdmin}
          actor={actor}
          onOpen={onOpen}
          onQuickApprove={onQuickApprove}
          onQuickReject={onQuickReject}
          selectedIds={selectedIds}
          onToggleSelect={onToggleSelect}
        />
      </div>
      <aside className="min-w-0">
        <LeaveRequestRail
          store={store}
          actor={actor}
          isAdmin={isAdmin}
          annualBalance={annualBalance}
          annualType={annualType}
          busy={busy}
          onSubmit={onRailSubmit}
          onOpenFullForm={onOpenFullForm}
        />
      </aside>
    </div>
  );
}
