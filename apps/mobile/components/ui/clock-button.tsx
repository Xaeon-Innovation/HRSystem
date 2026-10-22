import { Pressable, Text, View } from "react-native";
import { Hatch } from "./hatch";
import { IconFingerprint } from "./icons";

type Mode = "in" | "out" | "break";

/** 172×172 circular clock CTA matching prototype `.cbtn`. */
export function ClockButton({
  mode = "in",
  label,
  subtitle,
  onPress,
}: {
  mode?: Mode;
  label: string;
  subtitle?: string;
  onPress?: () => void;
}) {
  const body = (
    <View
      className="items-center justify-center gap-1.5"
      style={{ width: 172, height: 172, alignItems: "center", justifyContent: "center" }}
    >
      {mode === "in" ? <IconFingerprint size={30} color="#1A2600" /> : null}
      <Text
        className={`text-center text-[18px] font-semibold ${
          mode === "out" ? "text-ink-text" : mode === "break" ? "text-[#2a1500]" : "text-accent-ink"
        }`}
      >
        {label}
      </Text>
      {subtitle ? (
        <Text
          className={`text-[11.5px] font-medium opacity-75 ${
            mode === "out" ? "text-ink-text" : mode === "break" ? "text-[#2a1500]" : "text-accent-ink"
          }`}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: 172,
        height: 172,
        borderRadius: 999,
        overflow: "hidden",
        shadowColor: mode === "in" ? "#9ACD32" : "#000",
        shadowOpacity: mode === "in" ? 0.35 : 0.12,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
        elevation: 6,
      }}
    >
      {mode === "in" ? (
        <Hatch tone="accent" className="h-full w-full items-center justify-center">
          {body}
        </Hatch>
      ) : (
        <View
          className={`h-full w-full items-center justify-center ${
            mode === "out" ? "bg-ink" : "bg-warn"
          }`}
        >
          {body}
        </View>
      )}
    </Pressable>
  );
}
