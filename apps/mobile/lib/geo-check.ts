import { distanceMeters, insideZone } from "@hr/geo";
import type { MobileZone } from "@hr/shared";
import type { CapturedLocation } from "./location";

export type ZoneCheck = {
  distanceM: number;
  inside: boolean;
  effectiveDistanceM: number;
};

export function checkAgainstZone(
  fix: CapturedLocation,
  zone: MobileZone,
): ZoneCheck {
  const result = insideZone(
    { lat: fix.lat, lng: fix.lng },
    {
      lat: zone.lat,
      lng: zone.lng,
      radiusMeters: zone.radiusMeters,
    },
    fix.accuracyM,
    "strict",
  );
  return {
    distanceM: result.distanceMeters,
    inside: result.inside,
    effectiveDistanceM: result.effectiveDistanceMeters,
  };
}

export function metersBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  return distanceMeters(a, b);
}
