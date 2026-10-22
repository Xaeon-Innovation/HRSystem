import { Platform } from "react-native";
import { hasAcceptedBgLocationDisclosure } from "./privacy";

export type BgLocationPermissionResult =
  | "granted"
  | "denied"
  | "needs_disclosure"
  | "unavailable";

/**
 * Foreground (When In Use) location. Safe to call from clock / map flows.
 */
export async function requestForegroundLocationAsync(): Promise<boolean> {
  if (Platform.OS === "web") return true;
  try {
    const Location = require("expo-location") as typeof import("expo-location");
    const fg = await Location.requestForegroundPermissionsAsync();
    return fg.status === "granted";
  } catch {
    return false;
  }
}

/**
 * Background / Always location. Never shows the OS dialog until the user has
 * accepted the in-app prominent disclosure (Play + Apple requirement).
 */
export async function requestBackgroundLocationAsync(): Promise<BgLocationPermissionResult> {
  if (Platform.OS === "web") return "unavailable";
  try {
    const Location = require("expo-location") as typeof import("expo-location");
    const fg = await Location.getForegroundPermissionsAsync();
    if (fg.status !== "granted") {
      const asked = await Location.requestForegroundPermissionsAsync();
      if (asked.status !== "granted") return "denied";
    }

    const accepted = await hasAcceptedBgLocationDisclosure();
    if (!accepted) return "needs_disclosure";

    const bg = await Location.requestBackgroundPermissionsAsync();
    return bg.status === "granted" ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}
