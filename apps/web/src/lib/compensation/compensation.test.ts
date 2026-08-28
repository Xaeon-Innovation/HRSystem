import { describe, expect, it } from "vitest";
import {
  bandInsight,
  buildPayslip,
  changeDelta,
  dailyRate,
  toMonthlyEquivalent,
} from "./calc";
import { summarizeHours, hourlyEarned } from "./hours";
import { CompensationStore, resetCompensationStoreForTests } from "./store";
import { canAccessCompensationPage, canTransition } from "./workflow";
import type { CompensationRecord } from "./types";

const monthly: CompensationRecord = {
  id: "r1",
  employeeId: "e1",
  payStructure: "monthly",
  baseAmount: 12000,
  currency: "EGP",
  payFrequency: "monthly",
  hoursPerWeek: 40,
  workingDaysPerMonth: 22,
  effectiveDate: "2026-01-01",
  status: "active",
  gradeId: "band-g3",
  notes: "",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("toMonthlyEquivalent", () => {
  it("keeps monthly salary as-is", () => {
    expect(toMonthlyEquivalent(monthly)).toBe(12000);
  });

  it("converts weekly, daily, and hourly structures", () => {
    expect(toMonthlyEquivalent({ ...monthly, payStructure: "weekly", baseAmount: 2800 })).toBe(
      12133.33,
    );
    expect(toMonthlyEquivalent({ ...monthly, payStructure: "daily", baseAmount: 450 })).toBe(9900);
    expect(toMonthlyEquivalent({ ...monthly, payStructure: "hourly", baseAmount: 55 })).toBe(
      9533.33,
    );
  });

  it("treats commission-only base as zero", () => {
    expect(toMonthlyEquivalent({ ...monthly, payStructure: "commission_only", baseAmount: 0 })).toBe(
      0,
    );
  });
});

describe("payslip and bands", () => {
  it("builds gross, deductions, and net without statutory tax logic", () => {
    const slip = buildPayslip({
      record: monthly,
      components: [
        {
          id: "c1",
          employeeId: "e1",
          kind: "housing_allowance",
          label: "Housing",
          amount: 1500,
          amountType: "fixed",
          recurring: true,
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          status: "active",
          note: "",
        },
        {
          id: "c2",
          employeeId: "e1",
          kind: "tax_placeholder",
          label: "Tax placeholder",
          amount: 10,
          amountType: "percent_of_base",
          recurring: true,
          effectiveFrom: "2026-01-01",
          effectiveTo: null,
          status: "active",
          note: "",
        },
      ],
      variable: [
        {
          id: "v1",
          employeeId: "e1",
          employeeName: "Amina",
          department: "Sales",
          kind: "bonus",
          bonusType: "spot",
          amount: 2000,
          currency: "EGP",
          cycle: "one_off",
          commissionFormula: null,
          kpiLinked: true,
          kpiScore: 90,
          payoutPeriodStart: "2026-08-01",
          payoutPeriodEnd: "2026-08-31",
          status: "approved",
          notes: "",
          submittedById: "a",
          submittedByName: "A",
          approvedById: "a",
          approvedByName: "A",
          createdAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z",
        },
      ],
      adjustment: {
        employeeId: "e1",
        overtimeHours: 0,
        regularHours: 0,
        workedHours: 0,
        openShifts: 0,
        unpaidLeaveDays: 2,
        absenceDays: 0,
        attendancePenalty: 0,
        manualAdjustment: 0,
        manualNote: "",
      },
      periodStart: "2026-08-01",
      periodEnd: "2026-08-31",
    });
    expect(slip.base).toBe(12000);
    expect(slip.allowances).toBe(1500);
    expect(slip.incentives).toBe(2000);
    expect(slip.gross).toBe(15500);
    expect(slip.deductions).toBe(1200 + dailyRate(monthly) * 2);
    expect(slip.net).toBe(slip.gross - slip.deductions);
  });

  it("flags below/in/above band and computes compa-ratio", () => {
    const band = {
      id: "b",
      grade: "G4",
      role: "AE",
      department: "Sales",
      min: 14000,
      midpoint: 18000,
      max: 23000,
      currency: "EGP",
    };
    expect(bandInsight(12000, band).position).toBe("below");
    expect(bandInsight(18000, band).compaRatio).toBe(1);
    expect(bandInsight(24000, band).position).toBe("above");
  });

  it("computes change amount and percent", () => {
    expect(changeDelta(14000, 16000)).toEqual({ changeAmount: 2000, changePercent: 14.29 });
    expect(changeDelta(0, 1000).changePercent).toBeNull();
  });
});

describe("workflow", () => {
  it("allows pending → approved/rejected/returned only", () => {
    expect(canTransition("pending", "approved")).toBe(true);
    expect(canTransition("pending", "rejected")).toBe(true);
    expect(canTransition("approved", "rejected")).toBe(false);
  });

  it("keeps the compensation page off regular employees", () => {
    expect(
      canAccessCompensationPage(
        { id: "e", name: "E", role: "employee", employeeId: "e" },
        false,
      ),
    ).toBe(false);
    expect(
      canAccessCompensationPage(
        { id: "a", name: "A", role: "tenant_admin" },
        false,
      ),
    ).toBe(true);
  });
});

const admin = { id: "emp-karim", name: "Karim Said", role: "tenant_admin" as const };

describe("CompensationStore", () => {
  it("applies an approved merit increase to the record and history", () => {
    const store = resetCompensationStoreForTests();
    const before = store.record("emp-maya")!;
    expect(before.baseAmount).toBe(14000);
    store.decide("cr-maya-merit", "approved", admin, "Aligned with H1 review");
    const after = store.record("emp-maya")!;
    expect(after.baseAmount).toBe(16000);
    expect(after.status).toBe("active");
    expect(store.history("emp-maya")[0]?.changeType).toBe("merit_increase");
    expect(store.request("cr-maya-merit")?.status).toBe("approved");
  });

  it("does not change base pay when a request is rejected", () => {
    const store = resetCompensationStoreForTests();
    store.decide("cr-omar-market", "rejected", admin, "Hold until October budget.");
    expect(store.record("emp-omar")?.baseAmount).toBe(380);
    expect(store.request("cr-omar-market")?.status).toBe("rejected");
  });

  it("returns a request for edits without applying it", () => {
    const store = resetCompensationStoreForTests();
    store.decide("cr-maya-merit", "returned", admin, "Attach the appraisal PDF.");
    expect(store.record("emp-maya")?.baseAmount).toBe(14000);
    expect(store.request("cr-maya-merit")?.status).toBe("returned");
  });

  it("blocks employees from approving", () => {
    const store = resetCompensationStoreForTests();
    expect(() =>
      store.decide("cr-maya-merit", "approved", {
        id: "emp-maya",
        name: "Maya",
        role: "employee",
        employeeId: "emp-maya",
      }, "ok"),
    ).toThrow(/HR admins/);
  });

  it("builds payroll rows with overtime and unpaid leave impact", () => {
    const store = new CompensationStore();
    const omar = store.payrollRows(admin).find((r) => r.employeeId === "emp-omar");
    expect(omar).toBeTruthy();
    expect(omar!.overtime).toBeGreaterThan(0);
    expect(omar!.absenceDeduction).toBeGreaterThan(0);
    expect(omar!.net).toBe(omar!.gross - omar!.totalDeductions);
  });

  it("pays hourly staff from clock in/out hours", () => {
    const store = new CompensationStore();
    const youssef = store.payrollRows(admin).find((r) => r.employeeId === "emp-youssef");
    expect(youssef?.payStructure).toBe("hourly");
    expect(youssef!.workedHours).toBeGreaterThan(0);
    expect(youssef!.baseSalary).toBeCloseTo(55 * youssef!.regularHours, 1);
    expect(youssef!.overtime).toBeCloseTo(55 * 1.5 * youssef!.overtimeHoursWorked, 1);
  });

  it("lets HR put someone on an hourly rate", () => {
    const store = resetCompensationStoreForTests();
    store.setPaySetup(
      { employeeId: "emp-tariq", payStructure: "hourly", baseAmount: 70, hoursPerWeek: 30 },
      admin,
    );
    expect(store.record("emp-tariq")?.payStructure).toBe("hourly");
    expect(store.record("emp-tariq")?.baseAmount).toBe(70);
  });
});

describe("clock hours", () => {
  it("splits a long day into regular and overtime", () => {
    const hours = summarizeHours(
      [
        {
          employeeId: "e1",
          clockInAt: "2026-08-10T08:00:00.000+03:00",
          clockOutAt: "2026-08-10T18:00:00.000+03:00",
        },
      ],
      "2026-08-01",
      "2026-08-31",
      { hoursPerWeek: 40, employeeId: "e1" },
    );
    expect(hours.totalHours).toBe(10);
    expect(hours.regularHours).toBe(8);
    expect(hours.overtimeHours).toBe(2);
    expect(hourlyEarned(50, 8, 2)).toEqual({ regular: 400, overtime: 150, gross: 550 });
  });

  it("counts an open shift through asOf", () => {
    const hours = summarizeHours(
      [
        {
          employeeId: "e1",
          clockInAt: "2026-08-10T08:00:00.000+03:00",
          clockOutAt: null,
        },
      ],
      "2026-08-01",
      "2026-08-31",
      { asOf: "2026-08-10T12:00:00.000+03:00", employeeId: "e1" },
    );
    expect(hours.totalHours).toBe(4);
    expect(hours.openShiftCount).toBe(1);
  });
});
