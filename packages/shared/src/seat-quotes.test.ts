import { describe, expect, it } from "vitest";
import {
  clampSeats,
  polarSeatTiers,
  quoteForSeats,
  validateSeatCount,
} from "./seat-quotes.js";

describe("seat quotes", () => {
  it("returns floor price at or below included seats", () => {
    expect(quoteForSeats("ops", 25)).toBe(24900);
    expect(quoteForSeats("ops", 50)).toBe(24900);
    expect(quoteForSeats("scale", 100)).toBe(59900);
    expect(quoteForSeats("scale", 150)).toBe(59900);
  });

  it("applies overage above included seats", () => {
    expect(quoteForSeats("ops", 75)).toBe(24900 + 25 * 600);
    expect(quoteForSeats("ops", 100)).toBe(24900 + 50 * 600);
    expect(quoteForSeats("scale", 200)).toBe(59900 + 50 * 450);
  });

  it("clamps to min/max", () => {
    expect(clampSeats("ops", 10)).toBe(25);
    expect(clampSeats("ops", 200)).toBe(100);
  });

  it("validates seat counts", () => {
    expect(validateSeatCount("field", undefined)).toBeNull();
    expect(validateSeatCount("field", 10)).toMatch(/does not support/);
    expect(validateSeatCount("ops", undefined)).toMatch(/required/);
    expect(validateSeatCount("ops", 50)).toBeNull();
    expect(validateSeatCount("ops", 27)).toMatch(/steps/);
    expect(validateSeatCount("ops", 200)).toMatch(/between/);
  });

  it("builds polar graduated tiers", () => {
    expect(polarSeatTiers("ops")).toEqual([
      { minSeats: 25, maxSeats: 50, pricePerSeat: 0 },
      { minSeats: 51, maxSeats: 100, pricePerSeat: 600 },
    ]);
  });
});
