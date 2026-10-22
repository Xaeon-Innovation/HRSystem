import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { Button, IconLocate, IconTile } from "@/components/ui";
import { requestBackgroundLocationAsync } from "@/lib/location-permissions";
import { goBack } from "@/lib/nav";
import {
  acceptBgLocationDisclosure,
  BG_LOCATION_DISCLOSURE,
  PRIVACY_POLICY_URL,
} from "@/lib/privacy";
import { upgradeBackgroundTrackingIfPossible } from "@/lib/tracking";

/**
 * Prominent disclosure required before Android ACCESS_BACKGROUND_LOCATION /
 * iOS Always. Shown from onboarding and when enabling on-shift tracking.
 */
export default function LocationDisclosureScreen() {
  const { next } = useLocalSearchParams<{ next?: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = () => {
    if (next === "offline-map") {
      router.replace("/(onboarding)/offline-map");
      return;
    }
    if (router.canGoBack()) {
      goBack();
      return;
    }
    router.replace("/(tabs)");
  };

  const onAccept = async () => {
    setBusy(true);
    setError(null);
    try {
      await acceptBgLocationDisclosure();
      const result = await requestBackgroundLocationAsync();
      if (result === "granted") {
        await upgradeBackgroundTrackingIfPossible();
        finish();
        return;
      }
      if (result === "denied") {
        setError(
          "Location permission was denied. You can enable it later in system Settings, or tap Not now.",
        );
        return;
      }
      finish();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue");
    } finally {
      setBusy(false);
    }
  };

  const onDecline = () => {
    finish();
  };

  return (
    <View className="flex-1 bg-frame">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-[18px] pb-8 pt-10"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-4 items-start">
          <IconTile tone="tint">
            <IconLocate size={22} color="#6FA01B" />
          </IconTile>
        </View>
        <Text className="text-[26px] font-semibold leading-tight tracking-tight text-text">
          {BG_LOCATION_DISCLOSURE.title}
        </Text>
        <Text className="mt-3 text-[14px] leading-relaxed text-muted">
          {BG_LOCATION_DISCLOSURE.lead}
        </Text>

        <View className="mt-5 gap-3 rounded-[20px] border border-line bg-surface p-4">
          {BG_LOCATION_DISCLOSURE.bullets.map((line) => (
            <View key={line} className="flex-row gap-2.5">
              <Text className="mt-0.5 text-[13px] text-accent-ink">•</Text>
              <Text className="min-w-0 flex-1 text-[13px] leading-snug text-text">
                {line}
              </Text>
            </View>
          ))}
        </View>

        <Text className="mt-4 text-[12px] leading-snug text-muted">
          Full details: {PRIVACY_POLICY_URL}
        </Text>

        {error ? (
          <Text className="mt-3 text-[13px] text-danger">{error}</Text>
        ) : null}
      </ScrollView>

      <View className="gap-2 border-t border-line bg-frame px-[18px] pb-8 pt-3">
        <Button
          label={busy ? "Continuing…" : BG_LOCATION_DISCLOSURE.acceptLabel}
          variant="ink"
          disabled={busy}
          onPress={() => void onAccept()}
        />
        <Button
          label={BG_LOCATION_DISCLOSURE.declineLabel}
          variant="soft"
          disabled={busy}
          onPress={onDecline}
        />
      </View>
    </View>
  );
}
