import { parseIsoDate, rangesOverlap, todayIso, yearsOfService } from "./format";
import { availableToRequest } from "./balance";
import { countLeaveDays } from "./days";
import type {
  LeaveBalance,
  LeaveBlackout,
  LeaveConflict,
  LeaveEmployee,
  LeaveHoliday,
  LeavePolicy,
  LeaveRequest,
  LeaveRequestDraft,
  LeaveType,
  WeekendRule,
} from "./types";

const ACTIVE_OVERLAP_STATUSES = new Set(["pending", "approved"]);

export function findPolicyFor(
  policies: LeavePolicy[],
  leaveTypeId: string,
  employee: LeaveEmployee,
  asOf: string,
): LeavePolicy | undefined {
  const years = yearsOfService(employee.hireDate, asOf);
  const candidates = policies.filter((p) => p.leaveTypeId === leaveTypeId && p.enabled);
  const scored = candidates
    .map((p) => {
      const s = p.scope;
      if (s.department && s.department !== employee.department) return null;
      if (s.branchId && s.branchId !== employee.branchId) return null;
      if (s.role && s.role.toLowerCase() !== employee.role.toLowerCase()) return null;
      if (s.minYearsOfService != null && years < s.minYearsOfService) return null;
      if (s.maxYearsOfService != null && years > s.maxYearsOfService) return null;
      const specificity =
        Number(Boolean(s.department)) +
        Number(Boolean(s.branchId)) +
        Number(Boolean(s.role)) +
        Number(s.minYearsOfService != null) +
        Number(s.maxYearsOfService != null);
      return { p, specificity };
    })
    .filter((x): x is { p: LeavePolicy; specificity: number } => x != null);
  scored.sort((a, b) => b.specificity - a.specificity);
  return scored[0]?.p ?? candidates.find((p) => !hasScope(p));
}

function hasScope(policy: LeavePolicy): boolean {
  const s = policy.scope;
  return Boolean(
    s.department ||
      s.branchId ||
      s.role ||
      s.minYearsOfService != null ||
      s.maxYearsOfService != null,
  );
}

export function inBlackout(
  startDate: string,
  endDate: string,
  blackouts: LeaveBlackout[],
): LeaveBlackout | undefined {
  return blackouts.find((b) => rangesOverlap(startDate, endDate, b.startDate, b.endDate));
}

function noticeDaysNeeded(startDate: string, asOf: string): number {
  const start = parseIsoDate(startDate).getTime();
  const today = parseIsoDate(asOf).getTime();
  return Math.round((start - today) / 86_400_000);
}

export function detectConflicts(input: {
  draft: LeaveRequestDraft;
  employee: LeaveEmployee;
  leaveType: LeaveType;
  policy: LeavePolicy | undefined;
  balance: LeaveBalance | undefined;
  existing: LeaveRequest[];
  asOf?: string;
  ignoreRequestId?: string;
}): LeaveConflict[] {
  const asOf = input.asOf ?? todayIso();
  const { draft, employee, leaveType, policy, balance, existing } = input;
  const conflicts: LeaveConflict[] = [];

  if (!draft.startDate || !draft.endDate) {
    conflicts.push({
      kind: "invalid_range",
      severity: "error",
      message: "Choose a start and end date.",
    });
    return conflicts;
  }

  if (draft.endDate < draft.startDate) {
    conflicts.push({
      kind: "invalid_range",
      severity: "error",
      message: "End date cannot be before the start date.",
    });
    return conflicts;
  }

  if (!leaveType.enabled) {
    conflicts.push({
      kind: "policy_ineligible",
      severity: "error",
      message: `${leaveType.name} is not currently available.`,
    });
  }

  const weekendRule: WeekendRule = policy?.weekendRule ?? "sat_sun";
  const holidays: LeaveHoliday[] = policy?.holidays ?? [];
  const counted = countLeaveDays({
    startDate: draft.startDate,
    endDate: draft.endDate,
    partialDayType: draft.partialDayType,
    customHours: draft.customHours,
    weekendRule,
    holidays,
    countHolidays: policy?.countHolidays ?? false,
  });
  const days = draft.requestedDays ?? counted;

  if (days <= 0) {
    conflicts.push({
      kind: "invalid_range",
      severity: "error",
      message:
        "This range does not include any working days. Weekends or holidays may be excluded.",
    });
  }

  if (leaveType.attachmentRequired && !draft.attachmentName && !draft.asDraft) {
    conflicts.push({
      kind: "attachment_required",
      severity: "error",
      message: `${leaveType.name} requires an attachment before it can be submitted.`,
    });
  }

  if (draft.urgency === "emergency" && !leaveType.allowEmergency) {
    conflicts.push({
      kind: "policy_ineligible",
      severity: "error",
      message: `${leaveType.name} cannot be filed as emergency leave.`,
    });
  }

  if (
    draft.partialDayType !== "full" &&
    !leaveType.allowHalfDay &&
    draft.startDate === draft.endDate
  ) {
    conflicts.push({
      kind: "policy_ineligible",
      severity: "error",
      message: `${leaveType.name} does not allow half-days.`,
    });
  }

  if (policy) {
    const blackout = inBlackout(draft.startDate, draft.endDate, policy.blackoutDates);
    if (blackout) {
      conflicts.push({
        kind: "blackout",
        severity: "error",
        message: `This overlaps a restricted period: ${blackout.label}.`,
      });
    }

    if (draft.urgency !== "emergency" && policy.minNoticeDays > 0) {
      const notice = noticeDaysNeeded(draft.startDate, asOf);
      if (notice < policy.minNoticeDays) {
        conflicts.push({
          kind: "min_notice",
          severity: "error",
          message: `${leaveType.name} needs at least ${policy.minNoticeDays} days’ notice. This starts in ${Math.max(0, notice)} day${notice === 1 ? "" : "s"}.`,
        });
      }
    }

    if (policy.probationLockoutDays > 0 && employee.hireDate) {
      const probationEnd =
        employee.probationEndsOn ??
        addCalendarDays(employee.hireDate, policy.probationLockoutDays);
      if (asOf < probationEnd || draft.startDate < probationEnd) {
        conflicts.push({
          kind: "probation",
          severity: "error",
          message: `Leave is locked until probation ends on ${probationEnd}.`,
        });
      }
    }
  }

  const others = existing.filter(
    (r) => r.employeeId === employee.id && r.id !== input.ignoreRequestId,
  );

  const overlappingApproved = others.find(
    (r) =>
      r.status === "approved" &&
      rangesOverlap(draft.startDate, draft.endDate, r.startDate, r.endDate),
  );
  if (overlappingApproved) {
    conflicts.push({
      kind: "overlapping_approved",
      severity: "error",
      message: `Overlaps approved ${overlappingApproved.leaveTypeName} from ${overlappingApproved.startDate} to ${overlappingApproved.endDate}.`,
      relatedRequestId: overlappingApproved.id,
    });
  }

  const duplicatePending = others.find(
    (r) =>
      r.status === "pending" &&
      r.leaveTypeId === draft.leaveTypeId &&
      rangesOverlap(draft.startDate, draft.endDate, r.startDate, r.endDate),
  );
  if (duplicatePending) {
    conflicts.push({
      kind: "duplicate_pending",
      severity: "error",
      message: "A pending request already covers part of these dates.",
      relatedRequestId: duplicatePending.id,
    });
  }

  if (leaveType.tracksBalance && balance) {
    const reserve = policy?.reservePendingDays ?? true;
    const available = availableToRequest(balance, reserve);
    if (days > available + 1e-9) {
      conflicts.push({
        kind: "insufficient_balance",
        severity: policy?.negativeAllowed ? "warning" : "error",
        message: `This uses ${days} day${days === 1 ? "" : "s"} but ${available} remain${available === 1 ? "s" : ""} available.`,
      });
    }
  }

  if (policy && policy.staffingLimit > 0) {
    const overlappingPeople = new Set<string>();
    for (const r of existing) {
      if (r.id === input.ignoreRequestId) continue;
      if (r.employeeId === employee.id) continue;
      if (r.department !== employee.department) continue;
      if (!ACTIVE_OVERLAP_STATUSES.has(r.status)) continue;
      if (!rangesOverlap(draft.startDate, draft.endDate, r.startDate, r.endDate)) continue;
      overlappingPeople.add(r.employeeId);
    }
    overlappingPeople.add(employee.id);
    if (overlappingPeople.size > policy.staffingLimit) {
      conflicts.push({
        kind: "team_overlap",
        severity: "warning",
        message: `${overlappingPeople.size} people in ${employee.department} would be off at the same time (limit ${policy.staffingLimit}).`,
        employeeIds: [...overlappingPeople],
      });
    }
  }

  return conflicts;
}

function addCalendarDays(iso: string, days: number): string {
  const d = parseIsoDate(iso);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function hasBlockingConflicts(conflicts: LeaveConflict[]): boolean {
  return conflicts.some((c) => c.severity === "error");
}
