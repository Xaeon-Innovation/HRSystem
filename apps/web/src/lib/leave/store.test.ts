import { describe, expect, it } from "vitest";
import { LeaveStore } from "./store";

const admin = { id: "emp-karim", name: "Karim Said", role: "tenant_admin" as const };

describe("LeaveStore workflow", () => {
  it("deducts balance on approval and not on rejection", () => {
    const store = new LeaveStore();
    const before = store.balance("emp-omar", "lt-annual")!;
    store.decide("lr-omar-pending", "approved", admin, "Coverage is fine");
    const after = store.balance("emp-omar", "lt-annual")!;
    expect(after.used).toBe(before.used + 2);
    expect(after.remaining).toBe(before.remaining - 2);
    expect(after.pending).toBe(0);

    const mayaBefore = store.balance("emp-maya", "lt-annual")!;
    const created = store.submit(
      {
        employeeId: "emp-maya",
        leaveTypeId: "lt-annual",
        startDate: "2026-11-09",
        endDate: "2026-11-10",
        requestedDays: 2,
        partialDayType: "full",
        customHours: null,
        urgency: "planned",
        reason: "Short break after quarter close",
        handoverNotes: "Layla covers the inbox",
        coverageEmployeeId: "emp-layla",
        attachmentName: null,
        asDraft: false,
      },
      { id: "emp-maya", name: "Maya Soliman", role: "employee", employeeId: "emp-maya" },
    );
    store.decide(created.id, "rejected", admin, "Need you on the floor that week.");
    const mayaAfter = store.balance("emp-maya", "lt-annual")!;
    expect(mayaAfter.used).toBe(mayaBefore.used);
    expect(mayaAfter.remaining).toBe(mayaBefore.remaining);
  });

  it("restores deducted days when an approved request is cancelled before it starts", () => {
    const store = new LeaveStore();
    const before = store.balance("emp-maya", "lt-annual")!;
    store.cancel("lr-maya-half", admin, "School appointment moved");
    const after = store.balance("emp-maya", "lt-annual")!;
    expect(after.used).toBe(before.used - 0.5);
    expect(after.remaining).toBe(before.remaining + 0.5);
    expect(store.request("lr-maya-half")?.status).toBe("cancelled");
  });
});
