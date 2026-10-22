import type { ReactNode } from "react";
import { Text, View } from "react-native";

type Tone = "ok" | "warn" | "danger" | "info" | "ink" | "line" | "neutral";

const bgClass: Record<Tone, string> = {
  ok: "bg-accent-tint",
  warn: "bg-warn-soft",
  danger: "bg-danger-soft",
  info: "bg-info-soft",
  ink: "bg-ink",
  line: "border border-line-strong bg-transparent",
  neutral: "bg-surface-2",
};

const textClass: Record<Tone, string> = {
  ok: "text-accent-strong",
  warn: "text-warn-text",
  danger: "text-danger",
  info: "text-info",
  ink: "text-ink-text",
  line: "text-text-2",
  neutral: "text-text-2",
};

export function Chip({
  label,
  tone = "line",
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: ReactNode;
}) {
  return (
    <View
      className={`h-6 flex-row items-center justify-center gap-1 rounded-full px-2.5 ${bgClass[tone]}`}
      style={{ alignItems: "center", justifyContent: "center", flexDirection: "row" }}
    >
      {icon}
      <Text className={`text-[11px] font-semibold ${textClass[tone]}`}>{label}</Text>
    </View>
  );
}
