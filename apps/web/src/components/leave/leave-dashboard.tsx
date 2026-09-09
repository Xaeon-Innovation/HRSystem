"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api, getUser, type AuthUser } from "@/lib/api";
import { userHasModule } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TEXTAREA_CLASS } from "@/lib/leave/format";
import { LeaveBalancesTable } from "@/components/leave/leave-balances-table";
import { LeaveCalendarView } from "@/components/leave/leave-calendar-view";
import { LeaveHeader } from "@/components/leave/leave-header";
import { LeaveOverviewCards } from "@/components/leave/leave-overview-cards";
import { LeavePoliciesPanel } from "@/components/leave/leave-policies-panel";
import { LeaveReportsPanel } from "@/components/leave/leave-reports-panel";
import { LeaveRequestDetailDrawer } from "@/components/leave/leave-request-detail-drawer";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { LeaveRequestsTable } from "@/components/leave/leave-requests-table";
import { LeaveErrorState, LeaveLoadingSkeleton } from "@/components/leave/leave-states";
import { LeaveStore, type LeaveActor, type LeaveRequestFilters, type LeaveSnapshot } from "@/lib/leave";

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

export function LeaveDashboard() {
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
  const inbox = isAdmin ? store.inboxAlerts() : [];
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

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
          {error}
        </p>
      ) : null}

      {reminderCount > 0 && isAdmin ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          {reminderCount} pending request{reminderCount === 1 ? "" : "s"} past the reminder or
          escalation window.
        </p>
      ) : null}

      <LeaveOverviewCards
        summary={
          isAdmin
            ? summary
            : {
                ...summary,
                pendingCount: requests.filter((r) => r.status === "pending").length,
                upcomingAbsences: requests.filter((r) => r.status === "approved").length,
              }
        }
        remaining={myAnnual?.remaining ?? null}
        isAdmin={isAdmin}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="requests" className="flex-none px-3">
            Requests
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex-none px-3">
            Balances
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex-none px-3">
            Calendar
          </TabsTrigger>
          {isAdmin ? (
            <TabsTrigger value="policies" className="flex-none px-3">
              Policies
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="reports" className="flex-none px-3">
            Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 space-y-3">
          {isAdmin && selectedIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card px-3 py-2">
              <p className="text-sm">{selectedIds.length} selected</p>
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const res = await api<{ leave: LeaveSnapshot }>("/v1/leave/requests/bulk-decide", {
                      method: "POST",
                      body: JSON.stringify({
                        ids: selectedIds,
                        decision: "approved",
                        comment: "Bulk approved",
                      }),
                    });
                    applyLeave(res.leave);
                    setSelectedIds([]);
                  })
                }
              >
                Approve selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const first = selectedIds[0];
                  if (first) setRejectId(first);
                }}
              >
                Reject selected
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                Clear
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
            onOpen={setSelectedId}
            onQuickApprove={(id) =>
              void run(async () => {
                const res = await api<{ leave: LeaveSnapshot }>(`/v1/leave/requests/${id}/decide`, {
                  method: "POST",
                  body: JSON.stringify({ decision: "approved", comment: "Approved" }),
                });
                applyLeave(res.leave);
              })
            }
            onQuickReject={(id) => setRejectId(id)}
            selectedIds={selectedIds}
            onToggleSelect={(id, selectedNow) =>
              setSelectedIds((prev) =>
                selectedNow ? [...new Set([...prev, id])] : prev.filter((x) => x !== id),
              )
            }
          />
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
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
        </TabsContent>

        <TabsContent value="calendar" className="mt-4">
          <LeaveCalendarView
            events={store.calendar()}
            employees={employees}
            policies={policies}
            requests={store.requests(undefined, isAdmin ? actor : actor)}
            onOpen={setSelectedId}
          />
        </TabsContent>

        {isAdmin ? (
          <TabsContent value="policies" className="mt-4">
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
                      ? "No accruals due — already posted for this period."
                      : `Posted ${res.posted} accrual transaction${res.posted === 1 ? "" : "s"}.`,
                  );
                })
              }
              lastPosted={accrualMsg}
            />
          </TabsContent>
        ) : null}

        <TabsContent value="reports" className="mt-4">
          <LeaveReportsPanel summary={summary} />
        </TabsContent>
      </Tabs>

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
        title="Reject leave request"
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
          placeholder="Why this request is being declined"
        />
      </ConfirmDialog>
    </div>
  );
}
