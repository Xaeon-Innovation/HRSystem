import { describe, expect, it } from "vitest";
import {
  assertDailyDayBefore,
  graceMs,
  isValidActiveBreak,
  zonedDateTime,
} from "./shifts.js";

describe("assertDailyDayBefore", () => {
  it("allows daily work dates strictly after today in zone", () => {
    expect(() =>
      assertDailyDayBefore("2099-01-15", "UTC", "daily"),
    ).not.toThrow();
  });

  it("rejects daily work dates on or before today", () => {
    expect(() => assertDailyDayBefore("2000-01-01", "UTC", "daily")).toThrow(
      /day-before/,
    );
  });

  it("skips day-before rule for weekly/monthly", () => {
    expect(() =>
      assertDailyDayBefore("2000-01-01", "UTC", "weekly"),
    ).not.toThrow();
  });
});

describe("graceMs", () => {
  it("defaults to 15 minutes", () => {
    expect(graceMs({})).toBe(15 * 60_000);
  });

  it("uses tenant setting", () => {
    expect(graceMs({ latenessGraceMinutes: 10 })).toBe(10 * 60_000);
  });
});

describe("isValidActiveBreak", () => {
  it("is valid within duration", async () => {
    const startedAt = new Date(Date.now() - 5 * 60_000);
    expect(
      await isValidActiveBreak({
        status: "active",
        startedAt,
        durationMinutes: 30,
        plannedEndAt: null,
      }),
    ).toBe(true);
  });

  it("is invalid after duration", async () => {
    const startedAt = new Date(Date.now() - 45 * 60_000);
    expect(
      await isValidActiveBreak({
        status: "active",
        startedAt,
        durationMinutes: 30,
        plannedEndAt: null,
      }),
    ).toBe(false);
  });

  it("respects planned end earlier than duration", async () => {
    const startedAt = new Date(Date.now() - 2 * 60_000);
    const plannedEndAt = new Date(Date.now() - 30_000);
    expect(
      await isValidActiveBreak({
        status: "active",
        startedAt,
        durationMinutes: 60,
        plannedEndAt,
      }),
    ).toBe(false);
  });
});

describe("zonedDateTime", () => {
  it("builds a date for local HH:MM", () => {
    const d = zonedDateTime("2026-06-15", "09:00", "UTC");
    expect(d.toISOString()).toContain("2026-06-15T09:00:00");
  });
});
