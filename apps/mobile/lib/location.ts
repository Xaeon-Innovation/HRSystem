import { Platform } from "react-native";
import type { MobileOutboxEvent } from "@hr/shared";
import { checkAgainstZone } from "./geo-check";
import { useSession } from "./session";

export type CapturedLocation = NonNullable<MobileOutboxEvent["location"]>;

function zoneFallback(): CapturedLocation {
  const zone = useSession.getState().me?.zones[0];
  return {
    lat: zone?.lat ?? 25.0805,
    lng: zone?.lng ?? 55.1403,
    accuracyM: 12,
    mocked: true,
    at: new Date().toISOString(),
  };
}

async function rawGps(): Promise<CapturedLocation | null> {
  if (Platform.OS === "web") {
    if (typeof navigator === "undefined" || !navigator.geolocation) return null;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 8000,
          maximumAge: 5000,
        });
      });
      return {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracyM: pos.coords.accuracy || 20,
        mocked: false,
        at: new Date().toISOString(),
      };
    } catch {
      return null;
    }
  }

  try {
    const Location = require("expo-location") as typeof import("expo-location");
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    return {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracyM: pos.coords.accuracy ?? 20,
      mocked: Boolean(pos.mocked),
      at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

/** Best-effort GPS; falls back to zone center on web / denied permission. */
export async function captureLocation(): Promise<CapturedLocation> {
  return (await rawGps()) ?? zoneFallback();
}

/**
 * Location for clock / break outbox events.
 * Fixed-zone API rejects outside GPS — on web previews the browser fix is often
 * continents away, so we snap to the work-zone center (mocked) when outside.
 * Native keeps the real fix so outside_zone can surface correctly.
 */
export async function captureClockLocation(): Promise<CapturedLocation> {
  const zone = useSession.getState().me?.zones[0];
  const fix = await captureLocation();
  if (!zone) return fix;

  const check = checkAgainstZone(fix, zone);
  if (check.inside) return fix;

  if (Platform.OS === "web") {
    return {
      ...zoneFallback(),
      at: new Date().toISOString(),
    };
  }

  return fix;
}
