import { Platform } from "react-native";
import type { MobileDevice } from "@hr/shared";
import { storageGet, storageSet } from "./secure-storage";

const DEVICE_ID_KEY = "elevora.deviceId";

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Stable device id for refresh rotation (persisted). */
export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await storageGet(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = uuid();
  await storageSet(DEVICE_ID_KEY, id);
  return id;
}

export async function getMobileDevice(): Promise<MobileDevice> {
  const id = await getOrCreateDeviceId();
  return {
    id,
    // API enum is ios | android only; map web → android for preview.
    platform: Platform.OS === "ios" ? "ios" : "android",
    model: Platform.OS === "web" ? "web" : Platform.OS,
    appVersion: "0.1.0",
  };
}
