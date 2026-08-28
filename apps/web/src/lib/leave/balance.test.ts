import { describe, expect, it } from "vitest";
import { applyTransactionToBalance, availableToRequest, computeRemaining } from "./balance";
import type { LeaveBalance } from "./types";

function bal(partial: Partial<LeaveBalance> = {}): LeaveBalance {
  return {
    id: "b1",
    employeeId: "e1",
    leaveTypeId: "annual",
    openingBalance: 10,
    accrued: 8,
    carryOver: 2,
    adjustments: 0,
    used: 5,
    pending: 1,
    remaining: 0,
    negativeAllowed: false,
    lastAccrualAt: null,
    updatedAt: "2026-08-01T00:00:00.000Z",
    ...partial,
  };
}

describe("computeRemaining", () => {
  it("uses opening + accrued + carryOver + adjustments - used", () => {
    expect(computeRemaining(bal())).toBe(15);
  });
});

describe("applyTransactionToBalance", () => {
  it("deducts on approval and does not change remaining on pending reserve", () => {
    const opening = bal({ remaining: 15 });
    const deducted = applyTransactionToBalance(
      opening,
      { type: "DEDUCTION", amount: 2 },
      "2026-08-28T00:00:00.000Z",
    );
    expect(deducted.used).toBe(7);
    expect(deducted.remaining).toBe(13);

    const reserved = applyTransactionToBalance(
      opening,
      { type: "PENDING_RESERVE", amount: 2 },
      "2026-08-28T00:00:00.000Z",
    );
    expect(reserved.pending).toBe(3);
    expect(reserved.remaining).toBe(15);
  });

  it("restores unused days on cancellation credit", () => {
    const after = applyTransactionToBalance(
      bal({ used: 5, remaining: 15 }),
      { type: "CANCELLATION_CREDIT", amount: 2 },
      "2026-08-28T00:00:00.000Z",
    );
    expect(after.used).toBe(3);
    expect(after.remaining).toBe(17);
  });

  it("posts monthly accrual onto the accrued bucket", () => {
    const after = applyTransactionToBalance(
      bal(),
      { type: "ACCRUAL", amount: 2 },
      "2026-09-01T08:00:00.000Z",
    );
    expect(after.accrued).toBe(10);
    expect(after.remaining).toBe(17);
    expect(after.lastAccrualAt).toBe("2026-09-01T08:00:00.000Z");
  });
});

describe("availableToRequest", () => {
  it("optionally reserves pending days", () => {
    const b = bal({ remaining: 15, pending: 4 });
    expect(availableToRequest(b, true)).toBe(11);
    expect(availableToRequest(b, false)).toBe(15);
  });
});
