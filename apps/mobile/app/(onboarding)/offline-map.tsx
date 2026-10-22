import { router } from "expo-router";
import { Text, View } from "react-native";
import { Button, Card, Hatch } from "@/components/ui";
import { useSession } from "@/lib/session";

export default function OfflineMapScreen() {
  const setOnboardingDone = useSession((s) => s.setOnboardingDone);
  const workspace = useSession((s) => s.workspace);

  const finish = async () => {
    await setOnboardingDone(true);
    router.replace("/(tabs)");
  };

  return (
    <View className="flex-1 bg-frame px-[18px] pt-10">
      <View className="mb-2 flex-row justify-center gap-1.5">
        <View className="h-1.5 w-1.5 rounded-full bg-line-strong" />
        <View className="h-1.5 w-1.5 rounded-full bg-line-strong" />
        <View className="h-1.5 w-5 rounded-full bg-text" />
      </View>
      <Text className="mt-5 text-[26px] font-semibold leading-tight tracking-tight text-text">
        Download your work area
      </Text>
      <Text className="mt-2 text-[13px] text-muted">
        So the map and zone checks work without signal.
      </Text>

      <View className="mt-4 h-[200px] items-center justify-center overflow-hidden rounded-[18px] border border-line bg-surface-2">
        <View className="h-28 w-28 items-center justify-center rounded-full border-2 border-dashed border-accent bg-accent-tint">
          <Text className="text-[12px] font-semibold text-accent-ink">
            {workspace?.name?.slice(0, 12) ?? "Zone"}
          </Text>
        </View>
      </View>

      <Card className="mt-3">
        <View className="flex-row items-center justify-between gap-2">
          <View className="min-w-0 flex-1">
            <Text className="text-[14px] font-semibold text-text">
              {workspace?.name ?? "Your workspace"} zone
            </Text>
            <Text className="mt-0.5 text-[12px] text-muted">
              Suggested pack · Wi‑Fi recommended
            </Text>
          </View>
          <Text className="text-[14px] font-semibold tabular-nums text-text">
            —
          </Text>
        </View>
        <View className="mt-3 h-[22px] overflow-hidden rounded-lg bg-bar-idle">
          <Hatch tone="idle" className="h-full w-full" />
        </View>
        <Text className="mt-2 text-[12px] text-muted">
          Packs download after map packs ship — you can skip for now.
        </Text>
      </Card>

      <Button
        className="mt-4"
        label="Go to app"
        variant="ink"
        onPress={() => void finish()}
      />
      <Button
        className="mt-2"
        label="Skip for now"
        variant="soft"
        onPress={() => void finish()}
      />
    </View>
  );
}
