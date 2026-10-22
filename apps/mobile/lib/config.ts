import Constants from "expo-constants";
import { Platform } from "react-native";

type Extra = {
  apiUrl?: string;
  appEnv?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function hostFromExpo(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as { experienceUrl?: string }).experienceUrl;
  if (!hostUri) return null;
  try {
    const cleaned = hostUri.replace(/^[a-z]+:\/\//, "").split("/")[0];
    return cleaned.split(":")[0] || null;
  } catch {
    return null;
  }
}

/**
 * Fastify API base URL (no trailing slash).
 * On web, use same origin so Metro can proxy /v1 → API (port-forward friendly).
 */
export function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/$/, "");
  }
  if (Platform.OS === "web") {
    return "";
  }
  // Release builds must always use the URL baked in by app.config.ts; the
  // Metro-host and loopback fallbacks only make sense on a dev machine.
  if (!__DEV__) {
    return (extra.apiUrl ?? "").replace(/\/$/, "");
  }
  const host = hostFromExpo();
  if (host) return `http://${host}:4000`;
  return (extra.apiUrl ?? "http://127.0.0.1:4000").replace(/\/$/, "");
}

export const API_URL = getApiUrl();
export const APP_ENV = extra.appEnv ?? "development";
