import { describe, expect, it } from "vitest";
import { countLeaveDays, unusedDaysAfterCancel } from "./days";
import { monthlyAccrualAmount, planAccrualPosting } from "./accrual";
import { detectConflicts, hasBlockingConflicts } from "./conflicts";
import { canTransition, cancellationCreditDays } from "./workflow";
import type { LeaveBalance, LeaveEmployee, LeavePolicy, LeaveRequest, LeaveType } from "./types";

const holidays = [
  { date: "2026-08-31", name: "Bridge day" },
];

describe("countLeaveDays", () => {
  it("skips weekends and holidays by default", () => {
    const days = countLeaveDays({
      startDate: "2026-08-28",
      endDate: "2026-08-31",
      partialDayType: "full",
      weekendRule: "sat_sun",
      holidays,
      countHolidays: false,
    });
    expect(days).toBe(1);
  });

  it("counts a half-day as 0.5", () => {
    expect(
      countLeaveDays({
        startDate: "2026-08-28",
        endDate: "2026-08-28",
        partialDayType: "first_half",
        weekendRule: "sat_sun",
        holidays: [],
        countHolidays: false,
      }),
    ).toBe(0.5);
  });
});

describe("unusedDaysAfterCancel", () => {
  it("restores all days if cancelled before start", () => {
    expect(
      unusedDaysAfterCancel({
        startDate: "2026-09-10",
        endDate: "2026-09-12",
        requestedDays: 3,
        asOf: "2026-09-01",
        weekendRule: "none",
        holidays: [],
        countHolidays: true,
      }),
    ).toBe(3);
  });

  it("restores only remaining days during an active leave", () => {
    expect(
      unusedDaysAfterCancel({
        startDate: "2026-09-10",
        endDate: "2026-09-12",
        requestedDays: 3,
        asOf: "2026-09-11",
        weekendRule: "none",
        holidays: [],
        countHolidays: true,
      }),
    ).toBe(2);
  });
});

const employee: LeaveEmployee = {
  id: "e1",
  name: "Amina",
  role: "Sales",
  department: "Sales",
  branchId: "b1",
  branchName: "HQ",
  managerId: "m1",
  hireDate: "2022-01-01",
  probationEndsOn: "2022-04-01",
  status: "active",
};

const leaveType: LeaveType = {
  id: "annual",
  code: "annual",
  name: "Annual leave",
  description: "",
  color: "#0f766e",
  tracksBalance: true,
  approvalRequired: true,
  attachmentRequired: false,
  paid: true,
  countsAgainstAnnual: true,
  allowHalfDay: true,
  allowEmergency: false,
  enabled: true,
  sortOrder: 1,
};

const policy: LeavePolicy = {
  id: "p1",
  leaveTypeId: "annual",
  name: "Annual",
  enabled: true,
  scope: {},
  annualEntitlement: 21,
  accrual: {
    enabled: true,
    method: "monthly_fixed",
    monthlyDays: 2,
    prorateNewHires: true,
    runDayOfMonth: 1,
    tenureTiers: [],
  },
  carryOver: { enabled: true, maxDays: 5, expiryMonth: 3, expiryDay: 31 },
  negativeAllowed: false,
  probationLockoutDays: 0,
  minNoticeDays: 7,
  blackoutDates: [{ id: "bo", startDate: "2026-12-20", endDate: "2026-12-31", label: "Peak" }],
  weekendRule: "sat_sun",
  countHolidays: false,
  holidays: [],
  managerFirst: true,
  multiLevelEnabled: true,
  longLeaveDaysThreshold: 5,
  reservePendingDays: true,
  staffingLimit: 2,
  reminderHours: 24,
  escalationHours: 72,
  delegationEnabled: true,
  backupApproverId: "m1",
  backupApproverName: "Manager",
};

const balance: LeaveBalance = {
  id: "b",
  employeeId: "e1",
  leaveTypeId: "annual",
  openingBalance: 10,
  accrued: 2,
  carryOver: 0,
  adjustments: 0,
  used: 0,
  pending: 0,
  remaining: 12,
  negativeAllowed: false,
  lastAccrualAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
};

describe("detectConflicts", () => {
  it("blocks insufficient balance and blackout dates", () => {
    const insufficient = detectConflicts({
      draft: {
        employeeId: "e1",
        leaveTypeId: "annual",
        startDate: "2026-10-05",
        endDate: "2026-10-23",
        requestedDays: 15,
        partialDayType: "full",
        customHours: null,
        urgency: "planned",
        reason: "Long trip",
        handoverNotes: "",
        coverageEmployeeId: null,
        attachmentName: null,
        asDraft: false,
      },
      employee,
      leaveType,
      policy,
      balance,
      existing: [],
      asOf: "2026-08-28",
    });
    expect(insufficient.some((c) => c.kind === "insufficient_balance")).toBe(true);

    const blackout = detectConflicts({
      draft: {
        employeeId: "e1",
        leaveTypeId: "annual",
        startDate: "2026-12-21",
        endDate: "2026-12-22",
        requestedDays: 2,
        partialDayType: "full",
        customHours: null,
        urgency: "planned",
        reason: "Holiday",
        handoverNotes: "",
        coverageEmployeeId: null,
        attachmentName: null,
        asDraft: false,
      },
      employee,
      leaveType,
      policy,
      balance,
      existing: [],
      asOf: "2026-11-01",
    });
    expect(blackout.some((c) => c.kind === "blackout")).toBe(true);
    expect(hasBlockingConflicts(blackout)).toBe(true);
  });
});

describe("workflow", () => {
  it("does not allow approving a rejected request", () => {
    expect(canTransition("rejected", "approved")).toBe(false);
    expect(canTransition("pending", "approved")).toBe(true);
  });

  it("credits unused days when cancelling an approved leave mid-stream", () => {
    const request = {
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      requestedDays: 3,
      status: "approved",
    } as Pick<LeaveRequest, "startDate" | "endDate" | "requestedDays" | "status">;
    expect(
      cancellationCreditDays({
        request,
        asOf: "2026-09-11",
        weekendRule: "none",
        holidays: [],
        countHolidays: true,
      }),
    ).toBe(2);
  });
});

describe("accrual", () => {
  it("adds 2 days per month on the fixed method", () => {
    expect(
      monthlyAccrualAmount(policy.accrual, 21, employee, "2026-08-01"),
    ).toBe(2);
  });

  it("plans a posting when the last accrual is in a prior month", () => {
    const plan = planAccrualPosting({
      employee,
      policy,
      lastAccrualAt: "2026-07-01T00:00:00.000Z",
      asOf: "2026-08-28",
    });
    expect(plan?.amount).toBe(2);
  });
});
