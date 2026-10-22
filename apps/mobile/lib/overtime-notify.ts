import { Platform } from "react-native";

const SHIFT_END_ID = "elevora-shift-end";
const GRACE_ID = "elevora-overtime-grace";

/**
 * Schedule local notifications at shift end and grace−2min.
 * No-op on web / when notifications unavailable.
 */
export async function scheduleOvertimePrompts(opts: {
  shiftEndAt: Date;
  graceMinutes?: number;
}): Promise<void> {
  if (Platform.OS === "web") return;

  try {
    const Notifications =
      require("expo-notifications") as typeof import("expo-notifications");

    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    const perm = await Notifications.requestPermissionsAsync();
    if (!perm.granted) return;

    await cancelOvertimePrompts();

    const graceMs = (opts.graceMinutes ?? 15) * 60_000;
    const now = Date.now();
    const endMs = opts.shiftEndAt.getTime();
    const graceEndMs = endMs + graceMs;
    const warnMs = graceEndMs - 2 * 60_000;

    if (endMs > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: SHIFT_END_ID,
        content: {
          title: "Shift ending",
          body: "Your scheduled shift is ending. Stay for overtime or clock out?",
          data: { route: "/modal/overtime" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(endMs),
        },
      });
    }

    if (warnMs > now) {
      await Notifications.scheduleNotificationAsync({
        identifier: GRACE_ID,
        content: {
          title: "Overtime grace ending",
          body: "About 2 minutes left in the overtime grace window.",
          data: { route: "/modal/overtime" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(warnMs),
        },
      });
    }
  } catch (err) {
    console.warn("scheduleOvertimePrompts failed", err);
  }
}

export async function cancelOvertimePrompts(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const Notifications =
      require("expo-notifications") as typeof import("expo-notifications");
    await Notifications.cancelScheduledNotificationAsync(SHIFT_END_ID);
    await Notifications.cancelScheduledNotificationAsync(GRACE_ID);
  } catch {
    /* ignore */
  }
}
