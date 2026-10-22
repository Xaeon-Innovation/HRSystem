import { router } from "expo-router";
import { useState } from "react";
import { Platform, Text, View } from "react-native";
import { Button, Chip, IconBell, IconLocate, IconTile } from "@/components/ui";
import { requestForegroundLocationAsync } from "@/lib/location-permissions";
import { hasAcceptedBgLocationDisclosure } from "@/lib/privacy";
import { registerForPushAsync } from "@/lib/push";

export default function PermissionsScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const goNext = async () => {
    setBusy(true);
    setError(null);
    try {
      const fg = await requestForegroundLocationAsync();
      if (!fg && Platform.OS !== "web") {
        setError(
          "Location is needed to clock in inside your work zone. You can enable it in Settings later.",
        );
      }
      try {
        await registerForPushAsync();
      } catch {
        /* push optional during onboarding */
      }

      const accepted = await hasAcceptedBgLocationDisclosure();
      if (!accepted && Platform.OS !== "web") {
        router.push({
          pathname: "/location-disclosure",
          params: { next: "offline-map" },
        });
        return;
      }
      router.push("/(onboarding)/offline-map");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-frame px-[18px] pt-10">
      <View className="mb-2 flex-row justify-center gap-1.5">
        <View className="h-1.5 w-5 rounded-full bg-text" />
        <View className="h-1.5 w-1.5 rounded-full bg-line-strong" />
        <View className="h-1.5 w-1.5 rounded-full bg-line-strong" />
      </View>
      <Text className="mt-5 text-[26px] font-semibold leading-tight tracking-tight text-text">
        A few things so clock-in works anywhere
      </Text>
      <Text className="mt-2 text-[13px] text-muted">
        We only track location while you&apos;re on shift.
      </Text>

      <View className="mt-4 gap-2.5">
        {(
          [
            {
              icon: <IconLocate size={18} color="#6FA01B" />,
              tone: "tint" as const,
              title: "Location · while on shift",
              body: "Checks you're inside your work zone and records your route. Next step explains “all the time” access before the system prompt.",
              trailing: <Chip label="Required" tone="ok" />,
            },
            {
              icon: <IconBell size={18} color="#121212" />,
              tone: "default" as const,
              title: "Notifications",
              body: "Shift reminders, overtime prompts, leave decisions and tasks.",
              trailing: null,
            },
          ] as const
        ).map((row) => (
          <View
            key={row.title}
            className="flex-row items-start gap-3 rounded-[20px] border border-line bg-surface p-3.5"
          >
            <IconTile tone={row.tone}>{row.icon}</IconTile>
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold text-text">
                {row.title}
              </Text>
              <Text className="mt-1 text-[12px] leading-snug text-muted">
                {row.body}
              </Text>
            </View>
            {row.trailing}
          </View>
        ))}
      </View>

      {error ? (
        <Text className="mt-3 text-[13px] text-danger">{error}</Text>
      ) : null}

      <Button
        className="mt-4"
        label={busy ? "Working…" : "Continue"}
        variant="ink"
        disabled={busy}
        onPress={() => void goNext()}
      />
      <Button
        className="mt-2"
        label="Skip for now"
        variant="soft"
        disabled={busy}
        onPress={() => router.push("/(onboarding)/offline-map")}
      />
    </View>
  );
}
