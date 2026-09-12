import { describe, expect, it } from "vitest";
import { defaultPeriod, inRange } from "./period";

describe("defaultPeriod (calendar)", () => {
  it("uses calendar month bounds and previous month", () => {
    const p = defaultPeriod("monthly", new Date(2026, 8, 12)); // Sep 12 2026
    expect(p.from).toBe("2026-09-01");
    expect(p.to).toBe("2026-09-30");
    expect(p.previousFrom).toBe("2026-08-01");
    expect(p.previousTo).toBe("2026-08-31");
    expect(p.label).toBe("Sep 2026");
  });

  it("uses calendar quarter bounds", () => {
    const p = defaultPeriod("quarterly", new Date(2026, 8, 12)); // Q3
    expect(p.from).toBe("2026-07-01");
    expect(p.to).toBe("2026-09-30");
    expect(p.previousFrom).toBe("2026-04-01");
    expect(p.previousTo).toBe("2026-06-30");
    expect(p.label).toBe("Q3 2026");
  });

  it("uses calendar year bounds", () => {
    const p = defaultPeriod("yearly", new Date(2026, 8, 12));
    expect(p.from).toBe("2026-01-01");
    expect(p.to).toBe("2026-12-31");
    expect(p.previousFrom).toBe("2025-01-01");
    expect(p.previousTo).toBe("2025-12-31");
    expect(p.label).toBe("2026");
  });
});

describe("inRange", () => {
  it("includes endpoints", () => {
    expect(inRange("2026-09-01", "2026-09-01", "2026-09-30")).toBe(true);
    expect(inRange("2026-09-30T12:00:00Z", "2026-09-01", "2026-09-30")).toBe(
      true,
    );
    expect(inRange("2026-08-31", "2026-09-01", "2026-09-30")).toBe(false);
  });
});
