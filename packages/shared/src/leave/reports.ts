import { monthKey, rangesOverlap, todayIso } from "./format.js";
import type {
  LeaveCalendarEvent,
  LeaveDepartmentUsage,
  LeaveReportSummary,
  LeaveRequest,
  LeaveType,
} from "./types.js";

export function buildReportSummary(
  requests: LeaveRequest[],
  types: LeaveType[],
  unusedLeaveTotal: number,
  asOf = todayIso(),
): LeaveReportSummary {
  const month = monthKey(asOf);
  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedThisMonth = requests.filter(
    (r) => r.status === "approved" && r.approvedAt && r.approvedAt.slice(0, 7) === month,
  ).length;
  const rejectedThisMonth = requests.filter(
    (r) => r.status === "rejected" && r.rejectedAt && r.rejectedAt.slice(0, 7) === month,
  ).length;
  const currentlyOff = requests.filter(
    (r) => r.status === "approved" && r.startDate <= asOf && r.endDate >= asOf,
  ).length;
  const upcomingAbsences = requests.filter(
    (r) => r.status === "approved" && r.startDate > asOf,
  ).length;

  const approvalHours = requests
    .filter((r) => r.submittedAt && r.approvedAt)
    .map((r) => (new Date(r.approvedAt!).getTime() - new Date(r.submittedAt!).getTime()) / 3_600_000);
  const avgApprovalHours =
    approvalHours.length === 0
      ? null
      : Math.round((approvalHours.reduce((a, b) => a + b, 0) / approvalHours.length) * 10) / 10;

  const usedByType = new Map<string, number>();
  for (const r of requests.filter((x) => x.status === "approved")) {
    usedByType.set(r.leaveTypeName, (usedByType.get(r.leaveTypeName) ?? 0) + r.requestedDays);
  }
  let mostUsedLeaveType: string | null = null;
  let most = -1;
  for (const [name, days] of usedByType) {
    if (days > most) {
      most = days;
      mostUsedLeaveType = name;
    }
  }

  const deptMap = new Map<string, LeaveDepartmentUsage>();
  for (const r of requests.filter((x) => x.status === "approved")) {
    const row = deptMap.get(r.department) ?? { department: r.department, days: 0, people: 0 };
    row.days += r.requestedDays;
    deptMap.set(r.department, row);
  }
  const people = new Map<string, Set<string>>();
  for (const r of requests.filter((x) => x.status === "approved")) {
    const set = people.get(r.department) ?? new Set();
    set.add(r.employeeId);
    people.set(r.department, set);
  }
  const departmentUsage = [...deptMap.values()]
    .map((row) => ({ ...row, people: people.get(row.department)?.size ?? 0 }))
    .sort((a, b) => b.days - a.days);

  const balanceLiability = unusedLeaveTotal;
  void types;

  return {
    pendingCount,
    approvedThisMonth,
    rejectedThisMonth,
    currentlyOff,
    upcomingAbsences,
    avgApprovalHours,
    mostUsedLeaveType,
    departmentUsage,
    balanceLiability,
    unusedLeaveTotal,
  };
}

export function toCalendarEvents(
  requests: LeaveRequest[],
  types: LeaveType[],
): LeaveCalendarEvent[] {
  const colorByType = new Map(types.map((t) => [t.id, t.color]));
  return requests
    .filter((r) => r.status === "approved" || r.status === "pending")
    .map((r) => ({
      id: r.id,
      requestId: r.id,
      employeeId: r.employeeId,
      employeeName: r.employeeName,
      department: r.department,
      branchName: r.branchName,
      leaveTypeId: r.leaveTypeId,
      leaveTypeName: r.leaveTypeName,
      color: colorByType.get(r.leaveTypeId) ?? "#0f766e",
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
      requestedDays: r.requestedDays,
    }));
}

export function peopleOffOn(
  events: LeaveCalendarEvent[],
  iso: string,
): LeaveCalendarEvent[] {
  return events.filter(
    (e) => e.status === "approved" && rangesOverlap(iso, iso, e.startDate, e.endDate),
  );
}
