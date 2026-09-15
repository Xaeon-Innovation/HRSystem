import { describe, expect, it } from "vitest";
import { mapPolarStatus } from "./lib/polar.js";
import { effectiveSeatLimit } from "./lib/billing.js";
import {
  quoteForSeats,
  validateSeatCount,
} from "@hr/shared";

describe("mapPolarStatus", () => {
  it("maps known statuses", () => {
    expect(mapPolarStatus("active")).toBe("active");
    expect(mapPolarStatus("trialing")).toBe("trialing");
    expect(mapPolarStatus("past_due")).toBe("past_due");
    expect(mapPolarStatus("unpaid")).toBe("past_due");
    expect(mapPolarStatus("canceled")).toBe("canceled");
    expect(mapPolarStatus("paused")).toBe("expired");
  });
});

describe("effectiveSeatLimit", () => {
  it("prefers purchased_seats over plan seat_limit", () => {
    expect(
      effectiveSeatLimit({ purchasedSeats: 75 }, { seatLimit: 50 }),
    ).toBe(75);
    expect(
      effectiveSeatLimit({ purchasedSeats: null }, { seatLimit: 25 }),
    ).toBe(25);
    expect(effectiveSeatLimit(null, { seatLimit: null })).toBe(null);
  });
});

describe("checkout seat validation", () => {
  it("requires seats for ops/scale only", () => {
    expect(validateSeatCount("ops", 50)).toBeNull();
    expect(validateSeatCount("field", undefined)).toBeNull();
    expect(validateSeatCount("ops", undefined)).toMatch(/required/);
  });

  it("keeps ops quote below scale floor at max seats", () => {
    expect(quoteForSeats("ops", 100)).toBeLessThan(quoteForSeats("scale", 100));
  });
});

describe("subscriptionAllowsAccess date awareness", () => {
  it("blocks expired trials and missing subscriptions", async () => {
    const { subscriptionAllowsAccess } = await import("./lib/billing.js");
    expect(subscriptionAllowsAccess(null)).toBe(false);
    expect(
      subscriptionAllowsAccess({
        status: "trialing",
        trialEndsAt: new Date(Date.now() - 1000),
      }),
    ).toBe(false);
  });
});
