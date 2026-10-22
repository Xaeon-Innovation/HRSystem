import { Pressable, Text, View } from "react-native";
import { useTheme } from "@/lib/theme";
import { Avatar } from "./avatar";
import { IconBell } from "./icons";

export function AppHeader({
  name,
  subtitle,
  greeting,
  presence = "off",
  onAvatarPress,
  onAlertsPress,
  showAlertDot = true,
}: {
  name: string;
  subtitle: string;
  greeting: string;
  presence?: "on" | "off" | "late" | "none";
  onAvatarPress?: () => void;
  onAlertsPress?: () => void;
  showAlertDot?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View className="mb-1 flex-row items-center gap-2.5 pb-3.5 pt-1.5">
      <Pressable onPress={onAvatarPress} hitSlop={8}>
        <Avatar name={name} presence={presence} round />
      </Pressable>
      <View className="min-w-0 flex-1">
        <Text
          className="text-[16px] font-semibold tracking-tight text-text"
          numberOfLines={1}
        >
          {greeting}
        </Text>
        <Text className="text-[12px] text-muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <Pressable
        onPress={onAlertsPress}
        className="relative h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-line bg-surface"
        style={{ alignItems: "center", justifyContent: "center" }}
        hitSlop={8}
      >
        <IconBell size={18} color={colors.text} />
        {showAlertDot ? (
          <View className="absolute end-[11px] top-[10px] h-2 w-2 rounded-full border-2 border-surface bg-warn" />
        ) : null}
      </Pressable>
    </View>
  );
}
