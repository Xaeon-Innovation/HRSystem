import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

const SIZE = 236;
const R = 108;
const C = 2 * Math.PI * R;
const CX = 118;
const CY = 118;

/** 236×236 progress ring; stroke 10; center content via children. */
export function ClockRing({
  progress = 0,
  children,
}: {
  progress?: number;
  children?: ReactNode;
}) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View
      className="items-center justify-center self-center"
      style={{ width: SIZE, height: SIZE, marginVertical: 6 }}
    >
      <Svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx={CX}
          cy={CY}
          r={R}
          stroke="#EBEBE8"
          strokeWidth={10}
          fill="none"
        />
        <Circle
          cx={CX}
          cy={CY}
          r={R}
          stroke="#9ACD32"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${C * pct} ${C}`}
        />
      </Svg>
      {children}
    </View>
  );
}
