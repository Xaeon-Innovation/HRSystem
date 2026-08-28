import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./format";

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-08-28T12:00:00.000Z");

  it("uses minutes and hours", () => {
    expect(formatRelativeTime("2026-08-28T11:50:00.000Z", now)).toBe("10m ago");
    expect(formatRelativeTime("2026-08-28T09:00:00.000Z", now)).toBe("3h ago");
  });
});
