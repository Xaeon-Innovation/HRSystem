import { router } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui";
import { fetchMe } from "@/lib/api";
import { useAppI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

/**
 * Quick unlock gate after cold start with a stored session.
 * No Face ID / biometrics until those ship (avoids unused NSFaceIDUsageDescription).
 */
export default function UnlockScreen() {
  const { t } = useAppI18n();
  const setUnlocked = useSession((s) => s.setUnlocked);
  const setMe = useSession((s) => s.setMe);
  const onboardingDone = useSession((s) => s.onboardingDone);
  const clearSession = useSession((s) => s.clearSession);
  const me = useSession((s) => s.me);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onUnlock = async () => {
    setError(null);
    setBusy(true);
    try {
      const profile = await fetchMe();
      setMe(profile);
      await setUnlocked(true);
      router.replace(onboardingDone ? "/(tabs)" : "/(onboarding)/permissions");
    } catch {
      setError("Session expired. Sign in again.");
      await clearSession();
      router.replace("/(auth)/sign-in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 items-center justify-center bg-frame px-5">
      <Text className="text-2xl font-semibold text-text">
        {t("app.auth.unlockTitle")}
      </Text>
      <Text className="mt-2 text-center text-[13px] text-muted">
        {me?.user.name ?? "Welcome back"}
      </Text>
      <Text className="mt-4 text-center text-[12px] leading-snug text-muted">
        Continue with the session on this device, or sign in again with your
        password.
      </Text>
      {error ? (
        <Text className="mt-3 text-[13px] text-danger">{error}</Text>
      ) : null}
      <Button
        className="mt-6"
        label={busy ? "Unlocking…" : "Unlock"}
        variant="accent"
        disabled={busy}
        onPress={() => void onUnlock()}
      />
      <Button
        className="mt-2"
        label="Use password"
        variant="soft"
        disabled={busy}
        onPress={() => {
          void clearSession().then(() => router.replace("/(auth)/workspace"));
        }}
      />
    </View>
  );
}
