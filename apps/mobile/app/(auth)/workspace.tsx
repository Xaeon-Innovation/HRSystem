import { router } from "expo-router";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Button, Hatch } from "@/components/ui";
import { ApiError, lookupWorkspace } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useTheme } from "@/lib/theme";

/** Prototype stair pattern for auth art. */
const STAIRS = [
  0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1,
];

export default function WorkspaceScreen() {
  const setWorkspace = useSession((s) => s.setWorkspace);
  const { setAccent } = useTheme();
  const [slug, setSlug] = useState("acme");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onContinue = async () => {
    setError(null);
    setBusy(true);
    try {
      const workspace = await lookupWorkspace(slug.trim().toLowerCase());
      if (workspace.status === "suspended") {
        setError("This workspace is suspended. Contact your admin.");
        return;
      }
      await setWorkspace(workspace);
      setAccent(workspace.accentPreset);
      router.push("/(auth)/sign-in");
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.status === 404 ? "Could not find workspace" : e.message);
      } else {
        setError(
          e instanceof Error
            ? e.message
            : "Could not reach API — is Metro proxy / API up?",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-frame">
      <View className="relative h-[280px] overflow-hidden">
        <View className="absolute bottom-0 end-[-10px] flex-row flex-wrap content-end justify-end gap-1.5 pe-2">
          {STAIRS.map((v, i) =>
            v ? (
              <Hatch
                key={i}
                tone={i % 3 ? "accent" : "yellow"}
                className="h-11 w-11 rounded-[10px]"
              />
            ) : (
              <View key={i} className="h-11 w-11" />
            ),
          )}
        </View>
        <View className="absolute start-[18px] top-10">
          <View className="h-[46px] w-[46px] items-center justify-center rounded-[15px] bg-ink">
            <View className="h-4 w-4 rounded-[3px] bg-accent" />
          </View>
        </View>
      </View>

      <View className="flex-1 px-[18px]">
        <Text className="text-[28px] font-semibold leading-tight tracking-tight text-text">
          Clock in, track shifts and{"\n"}manage your day.
        </Text>
        <Text className="mt-2 text-[13.5px] text-muted">
          Enter your company workspace to continue.
        </Text>

        <Text className="mb-1.5 mt-3.5 text-xs font-semibold text-text-2">
          Workspace
        </Text>
        <View className="h-[52px] flex-row items-center gap-2.5 rounded-2xl border border-accent bg-surface px-3.5">
          <TextInput
            className="flex-1 text-[14.5px] text-text"
            autoCapitalize="none"
            autoCorrect={false}
            value={slug}
            onChangeText={setSlug}
            placeholder="acme"
            placeholderTextColor="#BDBDB8"
            editable={!busy}
          />
          <Text className="text-[13px] text-muted">.elevora.app</Text>
        </View>

        {error ? (
          <Text className="mt-3 text-[13px] text-danger">{error}</Text>
        ) : null}

        <Button
          className="mt-4"
          label={busy ? "…" : "Continue"}
          variant="ink"
          disabled={busy || !slug.trim()}
          onPress={() => void onContinue()}
        />
        <Button
          className="mt-2"
          label="Scan invite QR"
          variant="soft"
          disabled
        />
      </View>
    </View>
  );
}
