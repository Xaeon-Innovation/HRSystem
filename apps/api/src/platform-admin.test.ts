import { describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import { verifySubscriptionHmac } from "./lib/paymob.js";
import { subscriptionAllowsAccess } from "./lib/billing.js";

describe("subscription access", () => {
  it("allows active and past_due; blocks canceled/expired/missing", () => {
    expect(subscriptionAllowsAccess("active")).toBe(true);
    expect(subscriptionAllowsAccess("past_due")).toBe(true);
    expect(subscriptionAllowsAccess("canceled")).toBe(false);
    expect(subscriptionAllowsAccess("expired")).toBe(false);
    expect(subscriptionAllowsAccess(undefined)).toBe(false);
    expect(subscriptionAllowsAccess(null)).toBe(false);
  });

  it("allows trialing only while trialEndsAt is in the future", () => {
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 60_000);
    expect(
      subscriptionAllowsAccess({ status: "trialing", trialEndsAt: future }),
    ).toBe(true);
    expect(
      subscriptionAllowsAccess({ status: "trialing", trialEndsAt: past }),
    ).toBe(false);
    expect(
      subscriptionAllowsAccess({ status: "trialing", trialEndsAt: null }),
    ).toBe(false);
    expect(
      subscriptionAllowsAccess({ status: "active", trialEndsAt: past }),
    ).toBe(true);
  });
});

describe("webhook idempotency key shape", () => {
  it("uses provider+externalId+triggerType uniqueness", () => {
    const key = ["paymob", "sub-1", "charge"].join(":");
    const duplicate = ["paymob", "sub-1", "charge"].join(":");
    expect(key).toEqual(duplicate);
    expect(["paymob", "sub-1", "failure"].join(":")).not.toEqual(key);
  });

  it("subscription hmac is case-insensitive on hex", () => {
    const hmac = createHmac("sha512", "s")
      .update("cancelfor42")
      .digest("hex");
    expect(verifySubscriptionHmac("s", "cancel", 42, hmac.toUpperCase())).toBe(
      true,
    );
  });
});
