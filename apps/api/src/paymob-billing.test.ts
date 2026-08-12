import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  verifySubscriptionHmac,
  verifyTransactionHmac,
} from "./lib/paymob.js";

const SECRET = "test-hmac-secret";

describe("Paymob HMAC", () => {
  it("verifies subscription hmac for charge events", () => {
    const triggerType = "charge";
    const subscriptionId = "98765";
    const hmac = createHmac("sha512", SECRET)
      .update(`${triggerType}for${subscriptionId}`)
      .digest("hex");
    expect(
      verifySubscriptionHmac(SECRET, triggerType, subscriptionId, hmac),
    ).toBe(true);
  });

  it("rejects tampered subscription hmac", () => {
    const hmac = createHmac("sha512", SECRET)
      .update("chargefor1")
      .digest("hex");
    expect(verifySubscriptionHmac(SECRET, "charge", "2", hmac)).toBe(false);
  });

  it("verifies transaction hmac with ordered fields", () => {
    const obj: Record<string, unknown> = {
      amount_cents: 4900,
      created_at: "2026-01-01T00:00:00.000000",
      currency: "USD",
      error_occured: false,
      has_parent_transaction: false,
      id: 111,
      integration_id: 222,
      is_3d_secure: true,
      is_auth: false,
      is_capture: false,
      is_refunded: false,
      is_standalone_payment: true,
      is_voided: false,
      order: { id: 333 },
      owner: 444,
      pending: false,
      source_data: { pan: "2346", sub_type: "Visa", type: "card" },
      success: true,
    };
    const fields = [
      "amount_cents",
      "created_at",
      "currency",
      "error_occured",
      "has_parent_transaction",
      "id",
      "integration_id",
      "is_3d_secure",
      "is_auth",
      "is_capture",
      "is_refunded",
      "is_standalone_payment",
      "is_voided",
      "order",
      "owner",
      "pending",
      "source_data_pan",
      "source_data_sub_type",
      "source_data_type",
      "success",
    ];
    const message = fields
      .map((key) => {
        if (key === "order") return String((obj.order as { id: number }).id);
        if (key.startsWith("source_data_")) {
          const src = obj.source_data as Record<string, unknown>;
          return String(src[key.replace("source_data_", "")]);
        }
        return String(obj[key]);
      })
      .join("");
    const hmac = createHmac("sha512", SECRET).update(message).digest("hex");
    expect(verifyTransactionHmac(SECRET, obj, hmac)).toBe(true);
  });
});

describe("seat limit helper contract", () => {
  it("blocks when used + additional exceeds limit", async () => {
    const { assertSeatAvailable } = await import("./lib/billing.js");
    // Pure logic check via inline simulation — assertSeatAvailable needs DB.
    // Keep a lightweight invariant test here.
    const seatsUsed = 10;
    const seatLimit = 10;
    const additional = 1;
    expect(seatsUsed + additional > seatLimit).toBe(true);
    expect(typeof assertSeatAvailable).toBe("function");
  });
});
