import { Text, View } from "react-native";

export function SyncPill({
  label = "Synced",
  tone = "ok",
}: {
  label?: string;
  tone?: "ok" | "pending" | "error";
}) {
  const dot =
    tone === "ok" ? "bg-accent" : tone === "pending" ? "bg-warn" : "bg-danger";
  return (
    <View className="h-[30px] flex-row items-center gap-1.5 rounded-full border border-line bg-surface px-3">
      <View className={`h-2 w-2 rounded-full ${dot}`} />
      <Text className="text-xs font-semibold text-text">{label}</Text>
    </View>
  );
}
