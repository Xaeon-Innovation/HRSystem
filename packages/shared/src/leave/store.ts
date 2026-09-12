import { applyTransactionToBalance, availableToRequest } from "./balance.js";
import { detectConflicts, findPolicyFor, hasBlockingConflicts } from "./conflicts.js";
import { countLeaveDays } from "./days.js";
import { newId, rangesOverlap, todayIso } from "./format.js";
import { planAccrualPosting } from "./accrual.js";
import { catalogSnapshot, defaultBalanceFor } from "./catalog.js";
import { buildReportSummary, toCalendarEvents } from "./reports.js";
import { hasSystemModuleRole } from "../constants.js";
import {
  actorCanActOnStep,
  applyStepDecision,
  buildApprovalSteps,
  canTransition,
  cancellationCreditDays,
  currentApprovalStep,
  escalationDue,
  reminderDue,
} from "./workflow.js";
import type {
  LeaveActor,
  LeaveAuditEvent,
  LeaveBalance,
  LeaveBalanceTransaction,
  LeaveEmployee,
  LeaveNotificationSetting,
  LeavePolicy,
  LeaveRequest,
  LeaveRequestDraft,
  LeaveRequestFilters,
  LeaveRequestStatus,
  LeaveType,
} from "./types.js";

export type LeaveSnapshot = {
  employees: LeaveEmployee[];
  types: LeaveType[];
  policies: LeavePolicy[];
  balances: LeaveBalance[];
  transactions: LeaveBalanceTransaction[];
  requests: LeaveRequest[];
  notifications: LeaveNotificationSetting[];
};

export type LeavePersistedState = Omit<LeaveSnapshot, "employees">;

export function emptyLeaveSnapshot(): LeaveSnapshot {
  const catalog = catalogSnapshot();
  return {
    employees: [],
    types: catalog.types,
    policies: catalog.policies,
    balances: [],
    transactions: [],
    requests: [],
    notifications: catalog.notifications,
  };
}

export function persistableLeaveState(data: LeaveSnapshot): LeavePersistedState {
  return {
    types: data.types,
    policies: data.policies,
    balances: data.balances,
    transactions: data.transactions,
    requests: data.requests,
    notifications: data.notifications,
  };
}

function nowIso() {
  return new Date().toISOString();
}

function annualTypeId(types: LeaveType[]): string {
  return types.find((t) => t.countsAgainstAnnual && t.tracksBalance)?.id ?? types[0]?.id ?? "";
}

function balanceBucket(types: LeaveType[], type: LeaveType): string {
  if (type.countsAgainstAnnual) return annualTypeId(types);
  return type.id;
}

/** Backfill `attachments` for snapshots that only had name / "#" url. */
export function normalizeLeaveRequest(request: LeaveRequest): LeaveRequest {
  const existing = Array.isArray(request.attachments) ? request.attachments : [];
  if (existing.length > 0) {
    return {
      ...request,
      attachments: existing.slice(0, 3),
      attachmentName: existing[0]?.name ?? request.attachmentName,
      attachmentUrl: existing[0]?.dataUrl ?? null,
    };
  }
  const url =
    request.attachmentUrl && request.attachmentUrl !== "#"
      ? request.attachmentUrl
      : null;
  if (request.attachmentName && url) {
    const att = {
      id: `att-${request.id}`,
      name: request.attachmentName,
      mime: "application/octet-stream",
      size: 0,
      dataUrl: url,
    };
    return {
      ...request,
      attachments: [att],
      attachmentUrl: url,
    };
  }
  return {
    ...request,
    attachments: [],
    attachmentUrl: url,
  };
}

function normalizeSnapshot(data: LeaveSnapshot): LeaveSnapshot {
  return {
    ...data,
    requests: data.requests.map(normalizeLeaveRequest),
  };
}

export class LeaveStore {
  private data: LeaveSnapshot;

  constructor(seed?: LeaveSnapshot) {
    this.data = normalizeSnapshot(seed ?? emptyLeaveSnapshot());
  }

  private persist() {
    /* API persistence is handled by the caller after mutations. */
  }

  applySnapshot(next: LeaveSnapshot) {
    this.data = normalizeSnapshot(next);
  }

  snapshot(): LeaveSnapshot {
    return this.data;
  }

  persistableState(): LeavePersistedState {
    return persistableLeaveState(this.data);
  }

  employees() {
    return this.data.employees.filter((e) => e.status === "active");
  }

  types() {
    return [...this.data.types].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  policies() {
    return this.data.policies;
  }

  notifications() {
    return this.data.notifications;
  }

  transactions() {
    return [...this.data.transactions].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  hydrateDirectory(input: {
    employees?: Array<{
      id: string;
      name: string;
      email?: string | null;
      jobTitle?: string | null;
      role?: string;
      status?: string;
      hireDate?: string | null;
      branchId?: string | null;
      managerId?: string | null;
    }>;
    branches?: Array<{ id: string; name: string }>;
    current?: LeaveActor | null;
  }) {
    const branches = new Map((input.branches ?? []).map((b) => [b.id, b.name]));
    const nameById = new Map((input.employees ?? []).map((e) => [e.id, e.name]));
    for (const existing of this.data.employees) {
      if (!nameById.has(existing.id)) nameById.set(existing.id, existing.name);
    }
    const existing = new Map(this.data.employees.map((e) => [e.id, e]));
    const now = `${todayIso()}T08:00:00.000Z`;

    const ensureBalances = (employee: LeaveEmployee) => {
      for (const type of this.data.types.filter((t) => t.tracksBalance)) {
        if (this.data.balances.some((b) => b.employeeId === employee.id && b.leaveTypeId === type.id)) {
          continue;
        }
        const policy = this.policyFor(employee, type.id);
        this.data.balances.push(
          defaultBalanceFor(employee.id, type, now, policy?.annualEntitlement ?? 0),
        );
      }
    };

    const resolveManager = (managerId: string | null | undefined) => {
      if (!managerId) return { managerId: null as string | null, managerName: null as string | null };
      return {
        managerId,
        managerName: nameById.get(managerId) ?? null,
      };
    };

    for (const emp of input.employees ?? []) {
      if (existing.has(emp.id)) {
        const prev = existing.get(emp.id)!;
        prev.name = emp.name;
        prev.email = emp.email ?? prev.email;
        prev.role = emp.jobTitle || emp.role || prev.role;
        if (emp.branchId) {
          prev.branchId = emp.branchId;
          prev.branchName = branches.get(emp.branchId) ?? prev.branchName;
        }
        if (emp.hireDate) prev.hireDate = emp.hireDate;
        if (emp.managerId !== undefined) {
          const mgr = resolveManager(emp.managerId);
          prev.managerId = mgr.managerId;
          prev.managerName = mgr.managerName;
        }
        ensureBalances(prev);
        continue;
      }
      const branchId = emp.branchId || "unassigned";
      const mgr = resolveManager(emp.managerId);
      const next: LeaveEmployee = {
        id: emp.id,
        name: emp.name,
        email: emp.email ?? null,
        role: emp.jobTitle || emp.role || "Employee",
        department: departmentFromTitle(emp.jobTitle || emp.role || ""),
        branchId,
        branchName: branches.get(branchId) ?? "Unassigned",
        managerId: mgr.managerId,
        managerName: mgr.managerName,
        hireDate: emp.hireDate ?? todayIso(),
        probationEndsOn: null,
        status: emp.status === "inactive" ? "inactive" : "active",
      };
      this.data.employees.push(next);
      ensureBalances(next);
    }

    if (input.current?.employeeId && !this.data.employees.some((e) => e.id === input.current!.employeeId)) {
      const id = input.current.employeeId;
      const stub: LeaveEmployee = {
        id,
        name: input.current.name,
        role: "Employee",
        department: "General",
        branchId: "unassigned",
        branchName: "Unassigned",
        managerId: null,
        managerName: null,
        hireDate: todayIso(),
        probationEndsOn: null,
        status: "active",
      };
      this.data.employees.push(stub);
      ensureBalances(stub);
    }

    this.persist();
  }

  employee(id: string) {
    return this.data.employees.find((e) => e.id === id);
  }

  typeById(id: string) {
    return this.data.types.find((t) => t.id === id);
  }

  policyFor(employee: LeaveEmployee, leaveTypeId: string, asOf = todayIso()) {
    return findPolicyFor(this.data.policies, leaveTypeId, employee, asOf);
  }

  balance(employeeId: string, leaveTypeId: string) {
    const type = this.typeById(leaveTypeId);
    const bucket = type ? balanceBucket(this.data.types, type) : leaveTypeId;
    return this.data.balances.find((b) => b.employeeId === employeeId && b.leaveTypeId === bucket);
  }

  balancesFor(employeeId?: string) {
    return this.data.balances.filter((b) => !employeeId || b.employeeId === employeeId);
  }

  requests(filters?: Partial<LeaveRequestFilters>, viewer?: LeaveActor): LeaveRequest[] {
    let rows = [...this.data.requests];
    if (viewer && !hasSystemModuleRole(viewer, "leaves")) {
      const id = viewer.employeeId;
      rows = rows.filter(
        (r) =>
          Boolean(id) &&
          (r.employeeId === id ||
            r.managerId === id ||
            r.approvalSteps.some(
              (s) => s.status === "pending" && s.assigneeId === id,
            )),
      );
    }
    if (!filters) return rows.sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));

    const q = filters.search?.trim().toLowerCase() ?? "";
    return rows
      .filter((r) => {
        if (q && !`${r.employeeName} ${r.leaveTypeName} ${r.reason} ${r.status}`.toLowerCase().includes(q)) {
          return false;
        }
        if (filters.status && r.status !== filters.status) return false;
        if (filters.leaveTypeId && r.leaveTypeId !== filters.leaveTypeId) return false;
        if (filters.employeeId && r.employeeId !== filters.employeeId) return false;
        if (filters.department && r.department !== filters.department) return false;
        if (filters.branchId && r.branchId !== filters.branchId) return false;
        if (filters.managerId && r.managerId !== filters.managerId) return false;
        if (filters.from && r.endDate < filters.from) return false;
        if (filters.to && r.startDate > filters.to) return false;
        return true;
      })
      .sort((a, b) => (b.submittedAt ?? b.createdAt).localeCompare(a.submittedAt ?? a.createdAt));
  }

  request(id: string) {
    return this.data.requests.find((r) => r.id === id) ?? null;
  }

  preview(draft: LeaveRequestDraft) {
    const employee = this.employee(draft.employeeId);
    const leaveType = this.typeById(draft.leaveTypeId);
    if (!employee || !leaveType) {
      return {
        days: 0,
        conflicts: [],
        balance: undefined as LeaveBalance | undefined,
        available: 0,
        policy: undefined as LeavePolicy | undefined,
      };
    }
    const policy = this.policyFor(employee, leaveType.id);
    const days = countLeaveDays({
      startDate: draft.startDate,
      endDate: draft.endDate,
      partialDayType: draft.partialDayType,
      customHours: draft.customHours,
      weekendRule: policy?.weekendRule ?? "sat_sun",
      holidays: policy?.holidays ?? [],
      countHolidays: policy?.countHolidays ?? false,
    });
    const filled = { ...draft, requestedDays: draft.requestedDays ?? days };
    const balance = this.balance(employee.id, leaveType.id);
    const conflicts = detectConflicts({
      draft: filled,
      employee,
      leaveType,
      policy,
      balance,
      existing: this.data.requests,
    });
    return {
      days,
      conflicts,
      balance,
      available: balance ? availableToRequest(balance, policy?.reservePendingDays ?? true) : 0,
      policy,
    };
  }

  submit(draft: LeaveRequestDraft, actor: LeaveActor): LeaveRequest {
    const employee = this.employee(draft.employeeId);
    const leaveType = this.typeById(draft.leaveTypeId);
    if (!employee || !leaveType) throw new Error("Employee or leave type is missing.");

    const preview = this.preview(draft);
    const days = draft.requestedDays ?? preview.days;
    const filled = { ...draft, requestedDays: days };
    if (!draft.asDraft && hasBlockingConflicts(preview.conflicts)) {
      const first = preview.conflicts.find((c) => c.severity === "error");
      throw new Error(first?.message ?? "This request cannot be submitted.");
    }

    const at = nowIso();
    const status: LeaveRequestStatus = draft.asDraft
      ? "draft"
      : leaveType.approvalRequired
        ? "pending"
        : "approved";
    const id = newId("lr");
    const steps =
      status === "pending"
        ? buildApprovalSteps({
            requestId: id,
            employee,
            leaveType,
            policy: preview.policy,
            requestedDays: days,
            actor,
            adminName: "People ops",
          })
        : [];

    const request: LeaveRequest = {
      id,
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      branchId: employee.branchId,
      branchName: employee.branchName,
      managerId: employee.managerId,
      managerName: employee.managerName ?? null,
      leaveTypeId: leaveType.id,
      leaveTypeName: leaveType.name,
      startDate: draft.startDate,
      endDate: draft.endDate,
      requestedDays: days,
      partialDayType: draft.partialDayType,
      customHours: draft.customHours,
      urgency: draft.urgency,
      status,
      reason: draft.reason.trim(),
      attachments: (draft.attachments ?? []).slice(0, 3),
      attachmentName:
        draft.attachments?.[0]?.name ?? draft.attachmentName ?? null,
      attachmentUrl: draft.attachments?.[0]?.dataUrl ?? null,
      submittedAt: draft.asDraft ? null : at,
      approvedAt: status === "approved" ? at : null,
      rejectedAt: null,
      cancelledAt: null,
      decisionDate: status === "approved" ? at : null,
      rejectionReason: null,
      approverId: status === "approved" ? actor.id : null,
      approverName: status === "approved" ? actor.name : null,
      handoverNotes: draft.handoverNotes,
      coverageEmployeeId: draft.coverageEmployeeId,
      coverageEmployeeName: draft.coverageEmployeeId
        ? this.employee(draft.coverageEmployeeId)?.name ?? null
        : null,
      internalHrNote: "",
      comments: draft.reason
        ? [
            {
              id: newId("c"),
              requestId: id,
              kind: "employee",
              authorId: actor.id,
              authorName: actor.name,
              body: draft.reason.trim(),
              createdAt: at,
            },
          ]
        : [],
      approvalSteps: steps,
      audit: [
        this.event(id, draft.asDraft ? "created" : "submitted", actor, at, draft.asDraft ? "Draft saved" : "Request submitted"),
      ],
      conflicts: preview.conflicts,
      createdAt: at,
      updatedAt: at,
    };

    if (status === "pending" && preview.policy?.reservePendingDays && leaveType.tracksBalance) {
      this.postTxn({
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        type: "PENDING_RESERVE",
        amount: days,
        requestId: id,
        source: "workflow",
        note: "Reserved while pending",
        actor,
        at,
      });
    }

    if (status === "approved" && leaveType.tracksBalance) {
      this.postTxn({
        employeeId: employee.id,
        leaveTypeId: leaveType.id,
        type: "DEDUCTION",
        amount: days,
        requestId: id,
        source: "workflow",
        note: "Auto-approved deduction",
        actor,
        at,
      });
    }

    this.data.requests.unshift(request);
    this.persist();
    return request;
  }

  resubmit(id: string, draft: LeaveRequestDraft, actor: LeaveActor): LeaveRequest {
    const existing = this.request(id);
    if (!existing) throw new Error("Request not found.");
    if (existing.status !== "draft" && existing.status !== "returned") {
      throw new Error("Only draft or returned requests can be edited.");
    }
    this.data.requests = this.data.requests.filter((r) => r.id !== id);
    const created = this.submit({ ...draft, asDraft: draft.asDraft }, actor);
    const replacement: LeaveRequest = {
      ...created,
      id,
      createdAt: existing.createdAt,
      audit: [...existing.audit, ...created.audit.map((e) => ({ ...e, requestId: id }))],
      comments: created.comments.map((c) => ({ ...c, requestId: id })),
      approvalSteps: created.approvalSteps.map((s) => ({ ...s, requestId: id })),
    };
    this.data.requests = this.data.requests.map((r) => (r.id === created.id ? replacement : r));
    this.data.transactions = this.data.transactions.map((t) =>
      t.requestId === created.id ? { ...t, requestId: id } : t,
    );
    this.persist();
    return this.request(id)!;
  }

  decide(
    id: string,
    decision: "approved" | "rejected" | "returned",
    actor: LeaveActor,
    comment: string,
  ): LeaveRequest {
    const request = this.request(id);
    if (!request) throw new Error("Request not found.");
    if (!canTransition(request.status, decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "returned")) {
      throw new Error("This request cannot be updated from its current status.");
    }
    if (decision === "rejected" && !comment.trim()) {
      throw new Error("A rejection reason is required.");
    }
    if (decision === "returned" && !comment.trim()) {
      throw new Error("Tell the employee what to change.");
    }

    const step = currentApprovalStep(request);
    if (!actorCanActOnStep(actor, step)) {
      throw new Error("You are not the current approver for this request.");
    }

    const leaveType = this.typeById(request.leaveTypeId);
    const employee = this.employee(request.employeeId);
    const policy = employee ? this.policyFor(employee, request.leaveTypeId) : undefined;

    if (decision === "approved" && employee && leaveType) {
      const conflicts = detectConflicts({
        draft: {
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          startDate: request.startDate,
          endDate: request.endDate,
          requestedDays: request.requestedDays,
          partialDayType: request.partialDayType,
          customHours: request.customHours,
          urgency: request.urgency,
          reason: request.reason,
          handoverNotes: request.handoverNotes,
          coverageEmployeeId: request.coverageEmployeeId,
          attachmentName: request.attachmentName,
          attachments: request.attachments,
          asDraft: false,
        },
        employee,
        leaveType,
        policy,
        balance: this.balance(employee.id, leaveType.id),
        existing: this.data.requests,
        ignoreRequestId: request.id,
      });
      request.conflicts = conflicts;
      if (
        hasBlockingConflicts(
          conflicts.filter((c) => c.kind !== "duplicate_pending" && c.kind !== "min_notice"),
        )
      ) {
        const first = conflicts.find((c) => c.severity === "error" && c.kind !== "min_notice");
        throw new Error(first?.message ?? "Cannot approve while policy checks fail.");
      }
    }

    const at = nowIso();
    const stepped = applyStepDecision({
      request,
      actor,
      decision,
      comment,
      at,
    });
    const next = stepped.request;
    next.status = stepped.final ? stepped.nextStatus : "pending";
    next.updatedAt = at;
    next.audit = [
      ...next.audit,
      this.event(
        next.id,
        decision === "approved" ? "approved" : decision === "rejected" ? "rejected" : "returned",
        actor,
        at,
        comment || (stepped.final ? `Marked ${next.status}` : "Approved this step"),
      ),
    ];

    if (decision === "rejected") {
      next.rejectedAt = at;
      next.decisionDate = at;
      next.rejectionReason = comment.trim();
      next.approverId = actor.id;
      next.approverName = actor.name;
      this.releasePending(next, actor, at);
    } else if (decision === "returned") {
      next.decisionDate = at;
      next.approverId = actor.id;
      next.approverName = actor.name;
      next.comments = [
        ...next.comments,
        {
          id: newId("c"),
          requestId: next.id,
          kind: "approver",
          authorId: actor.id,
          authorName: actor.name,
          body: comment.trim(),
          createdAt: at,
        },
      ];
      this.releasePending(next, actor, at);
    } else if (stepped.final && next.status === "approved") {
      next.approvedAt = at;
      next.decisionDate = at;
      next.approverId = actor.id;
      next.approverName = actor.name;
      this.releasePending(next, actor, at);
      if (leaveType?.tracksBalance) {
        this.postTxn({
          employeeId: next.employeeId,
          leaveTypeId: next.leaveTypeId,
          type: "DEDUCTION",
          amount: next.requestedDays,
          requestId: next.id,
          source: "workflow",
          note: "Approved — balance deducted",
          actor,
          at,
        });
      }
    }

    this.replaceRequest(next);
    this.persist();
    return next;
  }

  cancel(id: string, actor: LeaveActor, note: string): LeaveRequest {
    const request = this.request(id);
    if (!request) throw new Error("Request not found.");
    if (!canTransition(request.status, "cancelled")) {
      throw new Error("This request cannot be cancelled.");
    }
    const at = nowIso();
    const asOf = todayIso();
    const employee = this.employee(request.employeeId);
    const leaveType = this.typeById(request.leaveTypeId);
    const policy = employee ? this.policyFor(employee, request.leaveTypeId, asOf) : undefined;

    if (request.status === "pending") {
      this.releasePending(request, actor, at);
    }

    if (request.status === "approved" && leaveType?.tracksBalance) {
      const credit = cancellationCreditDays({
        request,
        asOf,
        weekendRule: policy?.weekendRule ?? "sat_sun",
        holidays: policy?.holidays ?? [],
        countHolidays: policy?.countHolidays ?? false,
      });
      if (credit > 0) {
        this.postTxn({
          employeeId: request.employeeId,
          leaveTypeId: request.leaveTypeId,
          type: "CANCELLATION_CREDIT",
          amount: credit,
          requestId: request.id,
          source: "workflow",
          note: note || `Restored ${credit} unused day(s)`,
          actor,
          at,
        });
      }
    }

    const next: LeaveRequest = {
      ...request,
      status: "cancelled",
      cancelledAt: at,
      updatedAt: at,
      audit: [
        ...request.audit,
        this.event(request.id, "cancelled", actor, at, note || "Cancelled"),
      ],
    };
    this.replaceRequest(next);
    this.persist();
    return next;
  }

  bulkDecide(
    ids: string[],
    decision: "approved" | "rejected",
    actor: LeaveActor,
    comment: string,
  ) {
    const results: Array<{ id: string; ok: boolean; error?: string }> = [];
    for (const id of ids) {
      try {
        this.decide(id, decision, actor, comment);
        results.push({ id, ok: true });
      } catch (err) {
        results.push({ id, ok: false, error: err instanceof Error ? err.message : "Failed" });
      }
    }
    return results;
  }

  addComment(
    id: string,
    actor: LeaveActor,
    kind: LeaveRequest["comments"][number]["kind"],
    body: string,
  ) {
    const request = this.request(id);
    if (!request) throw new Error("Request not found.");
    const at = nowIso();
    request.comments = [
      ...request.comments,
      {
        id: newId("c"),
        requestId: id,
        kind,
        authorId: actor.id,
        authorName: actor.name,
        body: body.trim(),
        createdAt: at,
      },
    ];
    request.audit = [
      ...request.audit,
      this.event(id, "commented", actor, at, body.trim()),
    ];
    request.updatedAt = at;
    this.replaceRequest(request);
    this.persist();
    return request;
  }

  updateHrNote(id: string, note: string, actor: LeaveActor) {
    const request = this.request(id);
    if (!request) throw new Error("Request not found.");
    request.internalHrNote = note;
    request.updatedAt = nowIso();
    request.audit = [
      ...request.audit,
      this.event(id, "commented", actor, request.updatedAt, "Updated internal HR note"),
    ];
    this.replaceRequest(request);
    this.persist();
    return request;
  }

  adjustBalance(input: {
    employeeId: string;
    leaveTypeId: string;
    amount: number;
    note: string;
    actor: LeaveActor;
  }) {
    if (!input.note.trim()) throw new Error("Adjustments must include a note.");
    const at = nowIso();
    this.postTxn({
      employeeId: input.employeeId,
      leaveTypeId: input.leaveTypeId,
      type: "MANUAL_ADJUSTMENT",
      amount: input.amount,
      requestId: null,
      source: "admin",
      note: input.note.trim(),
      actor: input.actor,
      at,
    });
    this.persist();
    return this.balance(input.employeeId, input.leaveTypeId);
  }

  runMonthlyAccrual(actor: LeaveActor, asOf = todayIso()) {
    const at = nowIso();
    let posted = 0;
    for (const emp of this.employees()) {
      for (const type of this.data.types.filter((t) => t.tracksBalance && t.enabled)) {
        const policy = this.policyFor(emp, type.id, asOf);
        if (!policy) continue;
        const balance = this.balance(emp.id, type.id);
        const plan = planAccrualPosting({
          employee: emp,
          policy,
          lastAccrualAt: balance?.lastAccrualAt ?? null,
          asOf,
        });
        if (!plan) continue;
        this.postTxn({
          employeeId: emp.id,
          leaveTypeId: type.id,
          type: "ACCRUAL",
          amount: plan.amount,
          requestId: null,
          source: "accrual_job",
          note: `Monthly accrual ${plan.period} (${plan.amount} days)`,
          actor,
          at,
        });
        posted += 1;
      }
    }
    this.persist();
    return posted;
  }

  updateType(id: string, patch: Partial<LeaveType>) {
    this.data.types = this.data.types.map((t) => (t.id === id ? { ...t, ...patch } : t));
    this.persist();
    return this.typeById(id);
  }

  updatePolicy(id: string, patch: Partial<LeavePolicy>) {
    this.data.policies = this.data.policies.map((p) => {
      if (p.id !== id) return p;
      return {
        ...p,
        ...patch,
        accrual: { ...p.accrual, ...(patch.accrual ?? {}) },
        carryOver: { ...p.carryOver, ...(patch.carryOver ?? {}) },
        scope: { ...p.scope, ...(patch.scope ?? {}) },
      };
    });
    this.persist();
    return this.data.policies.find((p) => p.id === id);
  }

  updateNotification(event: LeaveNotificationSetting["event"], patch: Partial<LeaveNotificationSetting>) {
    this.data.notifications = this.data.notifications.map((n) =>
      n.event === event ? { ...n, ...patch } : n,
    );
    this.persist();
  }

  reports(asOf = todayIso()) {
    const unused = this.data.balances
      .filter((b) => this.typeById(b.leaveTypeId)?.tracksBalance)
      .reduce((sum, b) => sum + Math.max(0, b.remaining), 0);
    return buildReportSummary(this.data.requests, this.data.types, unused, asOf);
  }

  calendar() {
    return toCalendarEvents(this.data.requests, this.data.types);
  }

  inboxAlerts(asOf = todayIso()) {
    const pending = this.data.requests.filter((r) => r.status === "pending");
    return pending.map((r) => {
      const emp = this.employee(r.employeeId);
      const policy = emp ? this.policyFor(emp, r.leaveTypeId, asOf) : undefined;
      return {
        request: r,
        reminder: reminderDue(r.submittedAt, policy?.reminderHours ?? 24, nowIso()),
        escalation: escalationDue(r.submittedAt, policy?.escalationHours ?? 72, nowIso()),
      };
    });
  }

  overlappingOn(iso: string, department?: string) {
    return this.data.requests.filter((r) => {
      if (r.status !== "approved" && r.status !== "pending") return false;
      if (department && r.department !== department) return false;
      return rangesOverlap(iso, iso, r.startDate, r.endDate);
    });
  }

  resetDemo() {
    this.data = emptyLeaveSnapshot();
    this.persist();
  }

  private releasePending(request: LeaveRequest, actor: LeaveActor, at: string) {
    const type = this.typeById(request.leaveTypeId);
    const balance = this.balance(request.employeeId, request.leaveTypeId);
    if (!type?.tracksBalance || !balance || balance.pending <= 0) return;
    const amount = Math.min(balance.pending, request.requestedDays);
    this.postTxn({
      employeeId: request.employeeId,
      leaveTypeId: request.leaveTypeId,
      type: "PENDING_RELEASE",
      amount,
      requestId: request.id,
      source: "workflow",
      note: "Released pending reserve",
      actor,
      at,
    });
  }

  private postTxn(input: {
    employeeId: string;
    leaveTypeId: string;
    type: LeaveBalanceTransaction["type"];
    amount: number;
    requestId: string | null;
    source: string;
    note: string;
    actor: LeaveActor;
    at: string;
  }) {
    const type = this.typeById(input.leaveTypeId);
    const bucket = type ? balanceBucket(this.data.types, type) : input.leaveTypeId;
    let balance = this.data.balances.find((b) => b.employeeId === input.employeeId && b.leaveTypeId === bucket);
    if (!balance && type) {
      balance = defaultBalanceFor(input.employeeId, type, input.at);
      this.data.balances.push(balance);
    }
    if (!balance) return;
    const next = applyTransactionToBalance(balance, input, input.at);
    this.data.balances = this.data.balances.map((b) => (b.id === next.id ? next : b));
    this.data.transactions.unshift({
      id: newId("txn"),
      employeeId: input.employeeId,
      leaveTypeId: bucket,
      type: input.type,
      amount: input.amount,
      requestId: input.requestId,
      source: input.source,
      note: input.note,
      createdBy: input.actor.id,
      createdByName: input.actor.name,
      createdAt: input.at,
      balanceAfter: next.remaining,
    });
  }

  private replaceRequest(next: LeaveRequest) {
    this.data.requests = this.data.requests.map((r) => (r.id === next.id ? next : r));
  }

  private event(
    requestId: string,
    action: LeaveAuditEvent["action"],
    actor: LeaveActor,
    at: string,
    note: string,
  ): LeaveAuditEvent {
    return {
      id: newId("aud"),
      requestId,
      action,
      actorId: actor.id,
      actorName: actor.name,
      at,
      note,
    };
  }
}

function departmentFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/sales|account/.test(t)) return "Sales";
  if (/driver|ops|coordinat|dispatch/.test(t)) return "Operations";
  if (/hr|people|admin/.test(t)) return "People";
  return "General";
}

let singleton: LeaveStore | null = null;

export function getLeaveStore(): LeaveStore {
  if (!singleton) singleton = new LeaveStore();
  return singleton;
}

export function resetLeaveStore(seed?: LeaveSnapshot) {
  singleton = new LeaveStore(seed ?? emptyLeaveSnapshot());
  return singleton;
}
