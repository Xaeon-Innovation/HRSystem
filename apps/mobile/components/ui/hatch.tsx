import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import Svg, { Defs, Pattern, Rect, Line } from "react-native-svg";

type Tone = "accent" | "warn" | "yellow" | "danger" | "info" | "idle";

const fill: Record<Tone, string> = {
  accent: "#9ACD32",
  warn: "#F4A259",
  yellow: "#EFE444",
  danger: "#E5484D",
  info: "#3E8BFF",
  idle: "#EBEBE8",
};

/** 135° / 4px stripe / 9px period hatch fill. */
export function Hatch({
  tone = "accent",
  className = "",
  children,
  ...props
}: ViewProps & { tone?: Tone; className?: string; children?: ReactNode }) {
  const id = `hatch-${tone}`;
  return (
    <View className={`overflow-hidden ${className}`} {...props}>
      <Svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <Defs>
          <Pattern
            id={id}
            patternUnits="userSpaceOnUse"
            width={9}
            height={9}
            patternTransform="rotate(135)"
          >
            <Rect width={9} height={9} fill={fill[tone]} />
            <Line
              x1={0}
              y1={0}
              x2={0}
              y2={9}
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={4}
            />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {children}
    </View>
  );
}
