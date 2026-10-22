import type { ReactNode } from "react";
import { Text, View } from "react-native";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View className="items-center px-6 py-10" style={{ alignItems: "center" }}>
      <Text className="text-center text-[16px] font-semibold text-text">{title}</Text>
      {description ? (
        <Text className="mt-2 text-center text-[13px] text-muted">{description}</Text>
      ) : null}
      {action ? <View className="mt-4 w-full">{action}</View> : null}
    </View>
  );
}
