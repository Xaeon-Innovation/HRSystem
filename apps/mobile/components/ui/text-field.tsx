import { Text, TextInput, View, type TextInputProps } from "react-native";

export function TextField({
  label,
  className = "",
  ...props
}: TextInputProps & { label?: string; className?: string }) {
  return (
    <View className="w-full gap-1.5">
      {label ? (
        <Text className="text-[12.5px] font-medium text-muted">{label}</Text>
      ) : null}
      <TextInput
        className={`h-[52px] rounded-2xl border border-line bg-surface px-4 text-text ${className}`}
        placeholderTextColor="#8E8E89"
        {...props}
      />
    </View>
  );
}
