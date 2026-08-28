import { unusedDaysAfterCancel } from "./days";
import type {
  LeaveActor,
  LeaveApprovalStep,
  LeaveEmployee,
  LeavePolicy,
  LeaveRequest,
  LeaveRequestStatus,
  LeaveType,
} from "./types";

const ALLOWED: Record<LeaveRequestStatus, LeaveRequestStatus[]> = {
  draft: ["pending", "cancelled"],
  pending: ["approved", "rejected", "returned", "cancelled", "expired"],
  returned: ["pending", "cancelled", "draft"],
  approved: ["cancelled"],
  rejected: [],
  cancelled: [],
  expired: [],
};

export function canTransition(
  from: LeaveRequestStatus,
  to: LeaveRequestStatus,
): boolean {
  return ALLOWED[from].includes(to);
}

export function buildApprovalSteps(input: {
  requestId: string;
  employee: LeaveEmployee;
  leaveType: LeaveType;
  policy: LeavePolicy | undefined;
  requestedDays: number;
  actor: LeaveActor;
  adminName?: string;
}): LeaveApprovalStep[] {
  const { requestId, employee, leaveType, policy, requestedDays, actor } = input;
  if (!leaveType.approvalRequired) return [];

  const steps: LeaveApprovalStep[] = [];
  const adminId = actor.role === "tenant_admin" ? actor.id : "admin-queue";
  const adminName = input.adminName ?? "People ops";
  const backupId = policy?.delegationEnabled ? policy.backupApproverId : null;
  const backupName = policy?.delegationEnabled ? policy.backupApproverName : null;

  const managerFirst = policy?.managerFirst ?? false;
  const longLeave =
    Boolean(policy?.multiLevelEnabled) &&
    requestedDays >= (policy?.longLeaveDaysThreshold ?? 5);

  if (managerFirst && employee.managerId) {
    steps.push({
      id: `${requestId}-step-1`,
      requestId,
      level: 1,
      role: "manager",
      assigneeId: employee.managerId,
      assigneeName: employee.managerName ?? "Manager",
      backupId,
      backupName,
      status: "pending",
      actedAt: null,
      comment: null,
      delegatedToId: null,
      delegatedToName: null,
    });
  }

  steps.push({
    id: `${requestId}-step-${steps.length + 1}`,
    requestId,
    level: steps.length + 1,
    role: longLeave ? "hr" : "admin",
    assigneeId: adminId,
    assigneeName: adminName,
    backupId,
    backupName,
    status: steps.length === 0 ? "pending" : "waiting",
    actedAt: null,
    comment: null,
    delegatedToId: null,
    delegatedToName: null,
  });

  if (longLeave) {
    steps.push({
      id: `${requestId}-step-${steps.length + 1}`,
      requestId,
      level: steps.length + 1,
      role: "admin",
      assigneeId: adminId,
      assigneeName: adminName,
      backupId,
      backupName,
      status: "waiting",
      actedAt: null,
      comment: null,
      delegatedToId: null,
      delegatedToName: null,
    });
  }

  return steps;
}

export function currentApprovalStep(
  request: Pick<LeaveRequest, "approvalSteps">,
): LeaveApprovalStep | undefined {
  return request.approvalSteps.find((s) => s.status === "pending");
}

export function actorCanActOnStep(
  actor: LeaveActor,
  step: LeaveApprovalStep | undefined,
): boolean {
  if (!step) return actor.role === "tenant_admin";
  if (actor.role === "tenant_admin") return true;
  const ids = [step.assigneeId, step.backupId, step.delegatedToId].filter(Boolean);
  return ids.includes(actor.employeeId ?? actor.id);
}

export function applyStepDecision(input: {
  request: LeaveRequest;
  actor: LeaveActor;
  decision: "approved" | "rejected" | "returned" | "delegated";
  comment: string;
  at: string;
  delegateTo?: { id: string; name: string };
}): {
  request: LeaveRequest;
  final: boolean;
  nextStatus: LeaveRequestStatus;
} {
  const steps = input.request.approvalSteps.map((s) => ({ ...s }));
  const current = steps.find((s) => s.status === "pending");

  if (input.decision === "delegated" && current && input.delegateTo) {
    current.status = "delegated";
    current.actedAt = input.at;
    current.comment = input.comment;
    current.delegatedToId = input.delegateTo.id;
    current.delegatedToName = input.delegateTo.name;
    const nextPending: LeaveApprovalStep = {
      ...current,
      id: `${current.id}-delegated`,
      status: "pending",
      assigneeId: input.delegateTo.id,
      assigneeName: input.delegateTo.name,
      actedAt: null,
      comment: null,
      role: "backup",
    };
    const idx = steps.findIndex((s) => s.id === current.id);
    steps.splice(idx + 1, 0, nextPending);
    return {
      request: { ...input.request, approvalSteps: steps, updatedAt: input.at },
      final: false,
      nextStatus: "pending",
    };
  }

  if (current) {
    current.status =
      input.decision === "approved"
        ? "approved"
        : input.decision === "rejected"
          ? "rejected"
          : "skipped";
    current.actedAt = input.at;
    current.comment = input.comment;
  }

  if (input.decision === "rejected") {
    for (const s of steps) {
      if (s.status === "waiting" || s.status === "pending") s.status = "skipped";
    }
    return {
      request: { ...input.request, approvalSteps: steps, updatedAt: input.at },
      final: true,
      nextStatus: "rejected",
    };
  }

  if (input.decision === "returned") {
    for (const s of steps) {
      if (s.status === "waiting" || s.status === "pending") s.status = "skipped";
    }
    return {
      request: { ...input.request, approvalSteps: steps, updatedAt: input.at },
      final: true,
      nextStatus: "returned",
    };
  }

  const waiting = steps.find((s) => s.status === "waiting");
  if (waiting) {
    waiting.status = "pending";
    return {
      request: { ...input.request, approvalSteps: steps, updatedAt: input.at },
      final: false,
      nextStatus: "pending",
    };
  }

  return {
    request: { ...input.request, approvalSteps: steps, updatedAt: input.at },
    final: true,
    nextStatus: "approved",
  };
}

export function cancellationCreditDays(input: {
  request: Pick<LeaveRequest, "startDate" | "endDate" | "requestedDays" | "status">;
  asOf: string;
  weekendRule: LeavePolicy["weekendRule"];
  holidays: LeavePolicy["holidays"];
  countHolidays: boolean;
}): number {
  if (input.request.status !== "approved") return 0;
  return unusedDaysAfterCancel({
    startDate: input.request.startDate,
    endDate: input.request.endDate,
    requestedDays: input.request.requestedDays,
    asOf: input.asOf,
    weekendRule: input.weekendRule,
    holidays: input.holidays,
    countHolidays: input.countHolidays,
  });
}

export function hoursBetween(fromIso: string, toIso: string): number {
  return (new Date(toIso).getTime() - new Date(fromIso).getTime()) / 3_600_000;
}

export function reminderDue(
  submittedAt: string | null,
  reminderHours: number,
  nowIso: string,
): boolean {
  if (!submittedAt || reminderHours <= 0) return false;
  return hoursBetween(submittedAt, nowIso) >= reminderHours;
}

export function escalationDue(
  submittedAt: string | null,
  escalationHours: number,
  nowIso: string,
): boolean {
  if (!submittedAt || escalationHours <= 0) return false;
  return hoursBetween(submittedAt, nowIso) >= escalationHours;
}
