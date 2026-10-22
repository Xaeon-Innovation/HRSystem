import { Pressable, Text, View } from "react-native";

/** Prototype `.seg` control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <View
      className={`flex-row gap-0.5 rounded-[14px] border border-line bg-surface p-[3px] ${className}`}
    >
      {options.map((opt) => {
        const on = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            className={`h-[34px] flex-1 items-center justify-center rounded-[11px] px-2 ${
              on ? "bg-surface-3" : ""
            }`}
            style={{ alignItems: "center", justifyContent: "center" }}
          >
            <Text
              className={`text-[12.5px] ${
                on ? "font-semibold text-text" : "font-medium text-muted"
              }`}
              numberOfLines={1}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
