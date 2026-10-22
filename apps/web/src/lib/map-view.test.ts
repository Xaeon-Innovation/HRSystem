import { describe, expect, it } from "vitest";
import {
  estimateMapZoom,
  filterLiveLocations,
  formatSecondsAgo,
} from "./map-view";

describe("estimateMapZoom", () => {
  it("zooms in for a single point", () => {
    expect(estimateMapZoom([[25.2, 55.27]])).toBe(15);
  });

  it("zooms out as the spread grows", () => {
    expect(
      estimateMapZoom([
        [25.2, 55.27],
        [25.21, 55.28],
      ]),
    ).toBeGreaterThanOrEqual(14);
    expect(
      estimateMapZoom([
        [24.0, 54.0],
        [26.0, 56.0],
      ]),
    ).toBeLessThanOrEqual(10);
  });
});

describe("filterLiveLocations", () => {
  const rows = [
    { name: "Amira Hassan", jobTitle: "Nurse", role: "employee" },
    { name: "Omar Ali", jobTitle: null, role: "employee" },
  ];

  it("filters by name or title without hitting the network", () => {
    expect(filterLiveLocations(rows, "amira")).toEqual([rows[0]]);
    expect(filterLiveLocations(rows, "nurse")).toEqual([rows[0]]);
    expect(filterLiveLocations(rows, "  ")).toEqual(rows);
  });
});

describe("formatSecondsAgo", () => {
  it("uses just now, minutes, hours, and days", () => {
    expect(formatSecondsAgo(0)).toBe("Just now");
    expect(formatSecondsAgo(45)).toBe("Just now");
    expect(formatSecondsAgo(613)).toBe("10m ago");
    expect(formatSecondsAgo(3 * 3600)).toBe("3h ago");
    expect(formatSecondsAgo(2 * 86400)).toBe("2d ago");
  });
});
