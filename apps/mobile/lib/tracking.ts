import { Platform } from "react-native";
import type { MobileZone } from "@hr/shared";
import { checkAgainstZone } from "./geo-check";
import {
  flushLocationBatch,
  recordLocationPoint,
  startBatchFlushLoop,
  stopBatchFlushLoop,
} from "./location-batch";
import {
  requestBackgroundLocationAsync,
  requestForegroundLocationAsync,
} from "./location-permissions";
import { enqueueOutbox } from "./sync/outbox";
import { useTodayStore } from "./today-store";

export const BG_LOCATION_TASK = "elevora-field-location";
export const GEOFENCE_TASK = "elevora-field-geofence";

type TrackingMode = "off" | "continuous" | "geofence";

let mode: TrackingMode = "off";
let webWatchId: number | null = null;
let nativeSub: { remove: () => void } | null = null;
let tasksDefined = false;

function setTrackingActive(active: boolean) {
  useTodayStore.getState().setTrackingActive(active);
}

function updateZoneChip(lat: number, lng: number, accuracyM: number) {
  const me = useTodayStore.getState().me;
  const zone = me?.zones[0];
  if (!zone || me?.presenceMode !== "fixed_zone") return;
  const check = checkAgainstZone(
    { lat, lng, accuracyM, at: new Date().toISOString() },
    zone,
  );
  useTodayStore.getState().setZoneStatus({
    inside: check.inside,
    distanceM: check.distanceM,
  });
}

/** Register TaskManager handlers once (native only). */
export function ensureTrackingTasksDefined(): void {
  if (tasksDefined || Platform.OS === "web") return;
  try {
    const TaskManager =
      require("expo-task-manager") as typeof import("expo-task-manager");
    const Location = require("expo-location") as typeof import("expo-location");

    if (!TaskManager.isTaskDefined(BG_LOCATION_TASK)) {
      TaskManager.defineTask(BG_LOCATION_TASK, async ({ data, error }) => {
        if (error) {
          console.warn("bg location task error", error);
          return;
        }
        const locations =
          (data as { locations?: import("expo-location").LocationObject[] })
            ?.locations ?? [];
        for (const loc of locations) {
          await recordLocationPoint({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            accuracyM: loc.coords.accuracy ?? 25,
            recordedAt: new Date(loc.timestamp).toISOString(),
            mocked: Boolean(loc.mocked),
            speed: loc.coords.speed ?? undefined,
            heading: loc.coords.heading ?? undefined,
          });
          updateZoneChip(
            loc.coords.latitude,
            loc.coords.longitude,
            loc.coords.accuracy ?? 25,
          );
        }
      });
    }

    if (!TaskManager.isTaskDefined(GEOFENCE_TASK)) {
      TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
        if (error) {
          console.warn("geofence task error", error);
          return;
        }
        const event = data as {
          eventType?: number;
        };
        const clockState = useTodayStore.getState().clockState;
        if (clockState === "off") return;

        const enter = event.eventType === Location.GeofencingEventType.Enter;
        const exit = event.eventType === Location.GeofencingEventType.Exit;
        if (!enter && !exit) return;

        await enqueueOutbox({
          type: enter ? "zone.enter" : "zone.exit",
          ...(exit && clockState === "break" ? { duringBreak: true } : {}),
        });
      });
    }

    tasksDefined = true;
  } catch (err) {
    console.warn("tracking tasks unavailable", err);
  }
}

async function startNativeContinuous(): Promise<void> {
  const Location = require("expo-location") as typeof import("expo-location");
  ensureTrackingTasksDefined();

  const fgOk = await requestForegroundLocationAsync();
  if (!fgOk) {
    throw new Error("Location permission required for tracking");
  }

  const bg = await requestBackgroundLocationAsync();
  if (bg === "needs_disclosure") {
    useTodayStore.getState().setNeedsBgDisclosure(true);
    await startForegroundWatch();
    mode = "continuous";
    return;
  }
  useTodayStore.getState().setNeedsBgDisclosure(false);
  if (bg !== "granted") {
    await startForegroundWatch();
    mode = "continuous";
    return;
  }

  const started = await Location.hasStartedLocationUpdatesAsync(
    BG_LOCATION_TASK,
  );
  if (!started) {
    await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50,
      timeInterval: 60_000,
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Polara Field",
        notificationBody: "On shift · tracking location",
        notificationColor: "#C8F000",
      },
    });
  }
  mode = "continuous";
}

async function startNativeGeofence(zone: MobileZone): Promise<void> {
  const Location = require("expo-location") as typeof import("expo-location");
  ensureTrackingTasksDefined();

  const fgOk = await requestForegroundLocationAsync();
  if (!fgOk) {
    throw new Error("Location permission required for geofencing");
  }

  if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
    await Location.stopGeofencingAsync(GEOFENCE_TASK);
  }

  await Location.startGeofencingAsync(GEOFENCE_TASK, [
    {
      identifier: zone.id,
      latitude: zone.lat,
      longitude: zone.lng,
      radius: zone.radiusMeters,
      notifyOnEnter: true,
      notifyOnExit: true,
    },
  ]);
  // Foreground watch keeps the Today zone chip fresh while open.
  await startForegroundWatch();
  mode = "geofence";
}

async function startForegroundWatch(): Promise<void> {
  if (Platform.OS === "web") {
    if (
      typeof navigator === "undefined" ||
      !navigator.geolocation ||
      webWatchId != null
    ) {
      return;
    }
    webWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        void recordLocationPoint({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy || 20,
          recordedAt: new Date().toISOString(),
          mocked: false,
          speed: pos.coords.speed ?? undefined,
          heading: pos.coords.heading ?? undefined,
        });
        updateZoneChip(
          pos.coords.latitude,
          pos.coords.longitude,
          pos.coords.accuracy || 20,
        );
      },
      () => {
        /* ignore */
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 },
    );
    return;
  }

  if (nativeSub) return;
  const Location = require("expo-location") as typeof import("expo-location");
  const fgOk = await requestForegroundLocationAsync();
  if (!fgOk) return;
  nativeSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 10,
      timeInterval: 10_000,
    },
    (loc) => {
      void recordLocationPoint({
        lat: loc.coords.latitude,
        lng: loc.coords.longitude,
        accuracyM: loc.coords.accuracy ?? 25,
        recordedAt: new Date(loc.timestamp).toISOString(),
        mocked: Boolean(loc.mocked),
      });
      updateZoneChip(
        loc.coords.latitude,
        loc.coords.longitude,
        loc.coords.accuracy ?? 25,
      );
    },
  );
}

/**
 * Start shift tracking. Mobile-presence → continuous updates;
 * fixed-zone → OS geofence (native) or watch (web).
 */
export async function startTracking(opts: {
  presenceMode: "mobile" | "fixed_zone" | string;
  fieldOps: boolean;
  zone?: MobileZone | null;
}): Promise<void> {
  if (!opts.fieldOps) {
    setTrackingActive(false);
    return;
  }
  if (mode !== "off") return;

  startBatchFlushLoop();

  try {
    if (Platform.OS === "web") {
      await startForegroundWatch();
      mode = "continuous";
    } else if (opts.presenceMode === "mobile") {
      await startNativeContinuous();
    } else if (opts.zone) {
      await startNativeGeofence(opts.zone);
    } else {
      await startForegroundWatch();
      mode = "continuous";
    }
    setTrackingActive(true);
  } catch (err) {
    console.warn("startTracking failed", err);
    setTrackingActive(false);
    mode = "off";
    stopBatchFlushLoop();
  }
}

/** Stop all location tasks and flush remaining points. */
export async function stopTracking(): Promise<void> {
  stopBatchFlushLoop();

  if (Platform.OS === "web" && webWatchId != null) {
    navigator.geolocation.clearWatch(webWatchId);
    webWatchId = null;
  }

  if (nativeSub) {
    nativeSub.remove();
    nativeSub = null;
  }

  if (Platform.OS !== "web") {
    try {
      const Location = require("expo-location") as typeof import("expo-location");
      if (await Location.hasStartedLocationUpdatesAsync(BG_LOCATION_TASK)) {
        await Location.stopLocationUpdatesAsync(BG_LOCATION_TASK);
      }
      if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) {
        await Location.stopGeofencingAsync(GEOFENCE_TASK);
      }
    } catch (err) {
      console.warn("stopTracking native cleanup", err);
    }
  }

  mode = "off";
  setTrackingActive(false);
  useTodayStore.getState().setZoneStatus(null);
  useTodayStore.getState().setNeedsBgDisclosure(false);
  await flushLocationBatch();
}

export function isTrackingActive(): boolean {
  return mode !== "off";
}

/**
 * After the user accepts the prominent disclosure, promote foreground-only
 * on-shift tracking to background updates when permission is granted.
 */
export async function upgradeBackgroundTrackingIfPossible(): Promise<void> {
  if (Platform.OS === "web" || mode !== "continuous") return;

  const bg = await requestBackgroundLocationAsync();
  if (bg === "needs_disclosure") {
    useTodayStore.getState().setNeedsBgDisclosure(true);
    return;
  }
  if (bg !== "granted") {
    useTodayStore.getState().setNeedsBgDisclosure(false);
    return;
  }

  useTodayStore.getState().setNeedsBgDisclosure(false);
  const Location = require("expo-location") as typeof import("expo-location");
  ensureTrackingTasksDefined();
  const started = await Location.hasStartedLocationUpdatesAsync(
    BG_LOCATION_TASK,
  );
  if (!started) {
    await Location.startLocationUpdatesAsync(BG_LOCATION_TASK, {
      accuracy: Location.Accuracy.Balanced,
      distanceInterval: 50,
      timeInterval: 60_000,
      pausesUpdatesAutomatically: true,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: "Polara Field",
        notificationBody: "On shift · tracking location",
        notificationColor: "#C8F000",
      },
    });
  }
}
