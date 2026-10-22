import { Text, View } from "react-native";

/** Prototype `.kv` three-column stats under the clock card. */
export function KvStats({
  items,
}: {
  items: Array<{ value: string; label: string; valueClassName?: string }>;
}) {
  return (
    <View className="mt-3.5 w-full flex-row border-t border-line pt-3.5">
      {items.map((item, i) => (
        <View
          key={item.label}
          className={`flex-1 items-center ${i > 0 ? "border-s border-line" : ""}`}
        >
          <Text
            className={`text-[15px] font-semibold tabular-nums text-text ${item.valueClassName ?? ""}`}
          >
            {item.value}
          </Text>
          <Text className="text-[11px] text-muted">{item.label}</Text>
        </View>
      ))}
    </View>
  );
}
