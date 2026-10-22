import { router } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import {
  Button,
  IconChevronLeft,
  IconTile,
} from "@/components/ui";
import { ApiError, loginWithPassword } from "@/lib/api";
import { useAppI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";
import { runSyncCycle } from "@/lib/sync/engine";

export default function SignInScreen() {
  const { t } = useAppI18n();
  const workspace = useSession((s) => s.workspace);
  const setTokens = useSession((s) => s.setTokens);
  const setMe = useSession((s) => s.setMe);
  const setUnlocked = useSession((s) => s.setUnlocked);
  const [email, setEmail] = useState("employee@acme.local");
  const [password, setPassword] = useState("Employee123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!workspace) {
    return (
      <View className="flex-1 bg-frame px-[18px] pt-16">
        <Text className="text-text">No workspace selected.</Text>
        <Button
          className="mt-4"
          label="Back"
          variant="line"
          onPress={() => router.replace("/(auth)/workspace")}
        />
      </View>
    );
  }

  const onSignIn = async () => {
    setError(null);
    setBusy(true);
    try {
      const result = await loginWithPassword({
        slug: workspace.slug,
        email: email.trim().toLowerCase(),
        password,
      });
      await setTokens(result.accessToken, result.refreshToken);
      setMe(result.me);
      await setUnlocked(true);
      void runSyncCycle().catch(() => {
        /* first sync best-effort */
      });
      if (result.mustChangePassword) {
        router.replace("/(auth)/change-password");
        return;
      }
      router.replace("/(onboarding)/permissions");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-frame px-[18px] pt-3">
      <View className="mb-2 flex-row items-center pb-2">
        <Pressable
          onPress={() => router.replace("/(auth)/workspace")}
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-line bg-surface"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <IconChevronLeft size={18} color="#121212" />
        </Pressable>
      </View>

      <View className="mt-2 flex-row items-center gap-2.5">
        <IconTile tone="ink">
          <View className="h-3 w-3 rounded-sm bg-accent" />
        </IconTile>
        <View>
          <Text className="text-[15px] font-semibold text-text">
            {workspace.name}
          </Text>
          <Text className="text-[12px] text-muted">
            {workspace.slug}.elevora.app
          </Text>
        </View>
      </View>

      <Text className="mt-6 text-[28px] font-semibold tracking-tight text-text">
        {t("app.auth.signInTitle")}
      </Text>
      <Text className="mt-2 text-[13.5px] text-muted">
        Use the email your admin added you with.
      </Text>

      <Text className="mb-1.5 mt-3.5 text-xs font-semibold text-text-2">
        Email
      </Text>
      <TextInput
        className="h-[52px] rounded-2xl border border-line-strong bg-surface px-3.5 text-[14.5px] text-text"
        autoCapitalize="none"
        keyboardType="email-address"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor="#BDBDB8"
        editable={!busy}
      />

      <Text className="mb-1.5 mt-3.5 text-xs font-semibold text-text-2">
        Password
      </Text>
      <TextInput
        className="h-[52px] rounded-2xl border border-accent bg-surface px-3.5 text-[14.5px] text-text"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor="#BDBDB8"
        editable={!busy}
      />

      {error ? (
        <Text className="mt-3 text-[13px] text-danger">{error}</Text>
      ) : null}

      <Button
        className="mt-5"
        label={busy ? "…" : t("app.auth.signInTitle")}
        variant="ink"
        disabled={busy}
        onPress={() => void onSignIn()}
      />

      <View className="mt-3 flex-row gap-2.5 rounded-2xl bg-surface-2 px-3.5 py-3">
        <Text className="flex-1 text-[12.5px] leading-snug text-text-2">
          Your admin sends the first password. You&apos;ll be asked to change it
          after signing in.
        </Text>
      </View>
    </View>
  );
}
