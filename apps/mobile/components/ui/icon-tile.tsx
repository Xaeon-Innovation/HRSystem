import type { ReactNode } from "react";
import { View } from "react-native";

type Tone = "default" | "tint" | "warn" | "ink";

const toneClass: Record<Tone, string> = {
  default: "bg-surface-2",
  tint: "bg-accent-tint",
  warn: "bg-warn-soft",
  ink: "bg-ink",
};

/** 40×40 icon tile (sm 32). */
export function IconTile({
  children,
  tone = "default",
  size = "md",
}: {
  children: ReactNode;
  tone?: Tone;
  size?: "md" | "sm";
}) {
  const dim = size === "sm" ? 32 : 40;
  const radius = size === "sm" ? 10 : 13;
  return (
    <View
      className={`items-center justify-center ${toneClass[tone]}`}
      style={{
        width: dim,
        height: dim,
        borderRadius: radius,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </View>
  );
}
