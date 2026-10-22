import { Pressable, Text, View } from "react-native";
import { useAppI18n } from "@/lib/i18n";

export function OfflineBanner({
  queued = 0,
  onPress,
}: {
  queued?: number;
  onPress?: () => void;
}) {
  const { t } = useAppI18n();
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center gap-2.5 rounded-2xl bg-ink px-3.5 py-2.5"
    >
      <View className="h-2 w-2 rounded-full bg-warn" />
      <Text className="flex-1 text-[12.5px] text-ink-text">
        {t("app.offline.banner")}
        {queued > 0 ? ` · ${queued} queued` : ""}
      </Text>
    </Pressable>
  );
}
