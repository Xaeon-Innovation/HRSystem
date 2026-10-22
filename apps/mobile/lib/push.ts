import { Platform } from "react-native";
import { router } from "expo-router";

/** Map notification types → in-app routes (spec 07 deep links). */
export function routeForNotificationType(type: string): string {
  switch (type) {
    case "shift.changed":
    case "shift.reminder":
      return "/(tabs)/shifts";
    case "leave.decided":
    case "leave.returned":
      return "/(tabs)/leave";
    case "task.assigned":
    case "task.reviewed":
      return "/(tabs)/tasks";
    case "overtime.prompt":
      return "/modal/overtime";
    case "sync.conflict":
      return "/sync";
    default:
      return "/alerts";
  }
}

export function openNotificationDeepLink(type: string) {
  router.push(routeForNotificationType(type) as never);
}

/**
 * Register for Expo push. No-op on web; returns token string when available.
 */
export async function registerForPushAsync(): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const Notifications =
      require("expo-notifications") as typeof import("expo-notifications");
    const Constants = require("expo-constants").default as {
      expoConfig?: { extra?: { eas?: { projectId?: string } } };
      easConfig?: { projectId?: string };
    };

    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== "granted") {
      const req = await Notifications.requestPermissionsAsync();
      final = req.status;
    }
    if (final !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    const token = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    return token.data;
  } catch (err) {
    console.warn("push registration failed", err);
    return null;
  }
}
