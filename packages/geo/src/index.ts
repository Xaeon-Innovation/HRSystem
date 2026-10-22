export type LatLng = { lat: number; lng: number };

export type Zone = LatLng & { radiusMeters: number };

/** Tenant geofence accuracy policy. Default is strict (product plan). */
export type GeofenceMode = "strict" | "lenient";

/** Cap applied to GPS accuracy when expanding the effective radius check (meters). */
export const ACCURACY_CAP_METERS = 50;

/** Default max acceptable horizontal accuracy for clock-in (meters). */
export const DEFAULT_MAX_ACCURACY_METERS = 100;

/** Great-circle distance in meters (WGS84 sphere). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earth = 6_371_000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Legacy / lenient check: `distance <= radius`.
 * Kept for API callers that have not yet adopted accuracy-aware rules.
 */
export function isInsideGeofence(
  point: LatLng,
  zone: Zone,
): { inside: boolean; distanceMeters: number } {
  const distance = distanceMeters(point, { lat: zone.lat, lng: zone.lng });
  return { inside: distance <= zone.radiusMeters, distanceMeters: distance };
}

export function isAccuracyAcceptable(
  accuracyM: number | undefined | null,
  maxAccuracyM: number = DEFAULT_MAX_ACCURACY_METERS,
): boolean {
  if (accuracyM == null || !Number.isFinite(accuracyM)) return false;
  if (accuracyM < 0) return false;
  return accuracyM <= maxAccuracyM;
}

export type InsideZoneResult = {
  inside: boolean;
  distanceMeters: number;
  /** Effective distance used for the inside test (may include accuracy padding). */
  effectiveDistanceMeters: number;
  mode: GeofenceMode;
};

/**
 * Accuracy-aware zone check.
 * - strict (default): inside if `distance + min(accuracy, 50) <= radius`
 * - lenient: inside if `distance <= radius` (matches historic API behavior)
 *
 * Pass `accuracyM: 0` when accuracy is unknown and you still want a strict
 * distance-only check without padding.
 */
export function insideZone(
  point: LatLng,
  zone: Zone,
  accuracyM: number = 0,
  mode: GeofenceMode = "strict",
): InsideZoneResult {
  const distance = distanceMeters(point, { lat: zone.lat, lng: zone.lng });
  const pad =
    mode === "strict"
      ? Math.min(Math.max(accuracyM, 0), ACCURACY_CAP_METERS)
      : 0;
  const effective = distance + pad;
  return {
    inside: effective <= zone.radiusMeters,
    distanceMeters: distance,
    effectiveDistanceMeters: effective,
    mode,
  };
}
