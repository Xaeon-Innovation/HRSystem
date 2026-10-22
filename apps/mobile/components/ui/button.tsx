import { Pressable, Text, type PressableProps, type ViewStyle } from "react-native";

type Variant = "ink" | "accent" | "line" | "soft" | "danger-soft";
type Size = "md" | "sm";

const variantClass: Record<Variant, string> = {
  ink: "bg-ink",
  accent: "bg-accent",
  line: "bg-surface border border-line-strong",
  soft: "bg-surface-2",
  "danger-soft": "bg-danger-soft",
};

const textClass: Record<Variant, string> = {
  ink: "text-ink-text",
  accent: "text-accent-ink",
  line: "text-text",
  soft: "text-text",
  "danger-soft": "text-danger",
};

const center: ViewStyle = { alignItems: "center", justifyContent: "center" };

export function Button({
  label,
  variant = "ink",
  size = "md",
  className = "",
  style,
  ...props
}: PressableProps & {
  label: string;
  variant?: Variant;
  size?: Size;
  className?: string;
}) {
  const height = size === "sm" ? "h-[38px] rounded-xl px-3.5" : "h-[50px] rounded-2xl px-[18px]";
  return (
    <Pressable
      className={`w-full items-center justify-center ${height} ${variantClass[variant]} ${className}`}
      style={typeof style === "function" ? (s) => [center, style(s)] : [center, style]}
      {...props}
    >
      <Text className={`font-semibold ${size === "sm" ? "text-[13px]" : "text-[14.5px]"} ${textClass[variant]}`}>
        {label}
      </Text>
    </Pressable>
  );
}
