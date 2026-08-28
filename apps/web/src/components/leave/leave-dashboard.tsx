"use client";

import { useEffect, useMemo, useState } from "react";
import { api, getUser, type AuthUser } from "@/lib/api";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
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
import { getLeaveStore, type LeaveActor, type LeaveRequestFilters } from "@/lib/leave";

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
  };
}

export function LeaveDashboard() {
  const store = getLeaveStore();
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

  const refresh = () => setTick((n) => n + 1);
  const actor = actorFrom(user);
  const isAdmin = user?.role === "tenant_admin";

  useEffect(() => {
    setUser(getUser());
    setLoading(true);
    setError(null);
    const current = getUser();
    const admin = current?.role === "tenant_admin";
    Promise.all([
      admin
        ? api<{ employees: EmployeeOption[] }>("/v1/employees").catch(() => ({ employees: [] }))
        : Promise.resolve({ employees: [] as EmployeeOption[] }),
      admin
        ? api<{ branches: BranchOption[] }>("/v1/branches").catch(() => ({ branches: [] }))
        : Promise.resolve({ branches: [] as BranchOption[] }),
    ])
      .then(([empRes, branchRes]) => {
        store.hydrateDirectory({
          employees: empRes.employees,
          branches: branchRes.branches,
          current: actorFrom(current),
        });
        refresh();
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

  function run(action: () => void) {
    try {
      action();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950">
          {error}
        </p>
      ) : null}

      {reminderCount > 0 && isAdmin ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
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
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white/80 px-3 py-2">
              <p className="text-sm">{selectedIds.length} selected</p>
              <Button
                size="sm"
                onClick={() =>
                  run(() => {
                    store.bulkDecide(selectedIds, "approved", actor, "Bulk approved");
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
            onQuickApprove={(id) => run(() => store.decide(id, "approved", actor, "Approved"))}
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
              run(() => {
                store.adjustBalance({ employeeId, leaveTypeId, amount, note, actor });
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
                run(() => {
                  store.updateType(id, patch);
                })
              }
              onPolicyChange={(id, patch) =>
                run(() => {
                  store.updatePolicy(id, patch);
                })
              }
              onNotificationChange={(event, patch) =>
                run(() => {
                  store.updateNotification(event, patch);
                })
              }
              onRunAccrual={() =>
                run(() => {
                  const n = store.runMonthlyAccrual(actor);
                  setAccrualMsg(
                    n === 0
                      ? "No accruals due — already posted for this period."
                      : `Posted ${n} accrual transaction${n === 1 ? "" : "s"}.`,
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
        onSubmitted={refresh}
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
          run(() => {
            store.decide(id, "approved", actor, comment);
          })
        }
        onReject={(id, reason) =>
          run(() => {
            store.decide(id, "rejected", actor, reason);
          })
        }
        onReturn={(id, comment) =>
          run(() => {
            store.decide(id, "returned", actor, comment);
          })
        }
        onCancel={(id, note) =>
          run(() => {
            store.cancel(id, actor, note);
          })
        }
        onComment={(id, body) =>
          run(() => {
            store.addComment(id, actor, isAdmin ? "approver" : "employee", body);
          })
        }
        onHrNote={(id, note) =>
          run(() => {
            store.updateHrNote(id, note, actor);
          })
        }
        onEdit={(id) => {
          setSelectedId(null);
          setEditingId(id);
          setFormOpen(true);
        }}
      />

      <DialogPrimitive.Root
        open={Boolean(rejectId)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectId(null);
            setRejectReason("");
          }
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-foreground/30 backdrop-blur-[2px]" />
          <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-[61] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-card p-5 shadow-2xl">
            <DialogPrimitive.Title className="text-lg font-semibold tracking-tight">
              Reject leave request
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground">
              A written reason is required. The employee balance will not change.
            </DialogPrimitive.Description>
            <textarea
              className={`${TEXTAREA_CLASS} mt-3`}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why this request is being declined"
            />
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRejectId(null);
                  setRejectReason("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!rejectReason.trim()}
                onClick={() => {
                  if (!rejectId || !rejectReason.trim()) return;
                  const reason = rejectReason.trim();
                  if (selectedIds.length > 1 && selectedIds.includes(rejectId)) {
                    run(() => {
                      store.bulkDecide(selectedIds, "rejected", actor, reason);
                      setSelectedIds([]);
                    });
                  } else {
                    run(() => store.decide(rejectId, "rejected", actor, reason));
                  }
                  setRejectId(null);
                  setRejectReason("");
                }}
              >
                Reject
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
