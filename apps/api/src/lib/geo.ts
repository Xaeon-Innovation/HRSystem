/**
 * Re-exports shared geo helpers from `@hr/geo`.
 * Call sites keep importing from this module so behavior stays stable.
 *
 * Accuracy-aware `insideZone` / `isAccuracyAcceptable` are available for mobile
 * and future API validation; existing routes still use `isInsideGeofence`
 * (lenient: distance <= radius) — no behavior change in this ticket.
 */
export {
  ACCURACY_CAP_METERS,
  DEFAULT_MAX_ACCURACY_METERS,
  distanceMeters,
  insideZone,
  isAccuracyAcceptable,
  isInsideGeofence,
  type GeofenceMode,
  type InsideZoneResult,
  type LatLng,
  type Zone,
} from "@hr/geo";
