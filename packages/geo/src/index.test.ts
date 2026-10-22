import { describe, expect, it } from "vitest";
import {
  ACCURACY_CAP_METERS,
  distanceMeters,
  insideZone,
  isAccuracyAcceptable,
  isInsideGeofence,
} from "./index.js";

const zone = { lat: 25.08, lng: 55.14, radiusMeters: 100 };

describe("distanceMeters", () => {
  it("returns ~0 for the same point", () => {
    expect(distanceMeters({ lat: 25, lng: 55 }, { lat: 25, lng: 55 })).toBeLessThan(
      0.01,
    );
  });

  it("is roughly 111 km per degree of latitude", () => {
    const d = distanceMeters({ lat: 25, lng: 55 }, { lat: 26, lng: 55 });
    expect(d).toBeGreaterThan(110_000);
    expect(d).toBeLessThan(112_000);
  });
});

describe("isInsideGeofence (lenient / legacy)", () => {
  it("is inside when distance equals radius", () => {
    // ~100 m north of zone center
    const point = { lat: zone.lat + 100 / 111_320, lng: zone.lng };
    const r = isInsideGeofence(point, zone);
    expect(r.distanceMeters).toBeGreaterThan(95);
    expect(r.distanceMeters).toBeLessThan(105);
    expect(r.inside).toBe(true);
  });

  it("is outside when clearly beyond radius", () => {
    const point = { lat: zone.lat + 300 / 111_320, lng: zone.lng };
    const r = isInsideGeofence(point, zone);
    expect(r.inside).toBe(false);
    expect(r.distanceMeters).toBeGreaterThan(250);
  });
});

describe("insideZone", () => {
  it("lenient matches isInsideGeofence", () => {
    const point = { lat: zone.lat + 90 / 111_320, lng: zone.lng };
    const legacy = isInsideGeofence(point, zone);
    const modern = insideZone(point, zone, 40, "lenient");
    expect(modern.inside).toBe(legacy.inside);
    expect(modern.effectiveDistanceMeters).toBe(modern.distanceMeters);
  });

  it("strict pads distance with accuracy up to the cap", () => {
    // 80 m from center, 40 m accuracy → effective 120 > 100 → outside
    const point = { lat: zone.lat + 80 / 111_320, lng: zone.lng };
    const r = insideZone(point, zone, 40, "strict");
    expect(r.inside).toBe(false);
    expect(r.effectiveDistanceMeters).toBeCloseTo(r.distanceMeters + 40, 0);
  });

  it("strict caps accuracy padding at ACCURACY_CAP_METERS", () => {
    // 40 m from center, 200 m accuracy → pad only 50 → effective ~90 ≤ 100 → inside
    const point = { lat: zone.lat + 40 / 111_320, lng: zone.lng };
    const r = insideZone(point, zone, 200, "strict");
    expect(r.effectiveDistanceMeters).toBeCloseTo(
      r.distanceMeters + ACCURACY_CAP_METERS,
      0,
    );
    expect(r.inside).toBe(true);
  });

  it("strict with accuracy 0 is distance-only", () => {
    const point = { lat: zone.lat + 90 / 111_320, lng: zone.lng };
    const r = insideZone(point, zone, 0, "strict");
    expect(r.inside).toBe(true);
    expect(r.effectiveDistanceMeters).toBe(r.distanceMeters);
  });
});

describe("isAccuracyAcceptable", () => {
  it("rejects missing or negative accuracy", () => {
    expect(isAccuracyAcceptable(undefined)).toBe(false);
    expect(isAccuracyAcceptable(null)).toBe(false);
    expect(isAccuracyAcceptable(-1)).toBe(false);
  });

  it("accepts within default max", () => {
    expect(isAccuracyAcceptable(25)).toBe(true);
    expect(isAccuracyAcceptable(100)).toBe(true);
    expect(isAccuracyAcceptable(101)).toBe(false);
  });

  it("respects custom max", () => {
    expect(isAccuracyAcceptable(60, 50)).toBe(false);
    expect(isAccuracyAcceptable(40, 50)).toBe(true);
  });
});
