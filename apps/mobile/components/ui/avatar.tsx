import { Text, View } from "react-native";

type Presence = "on" | "off" | "late" | "none";

const AVC = [
  "#F9D9A6",
  "#CDE7B0",
  "#C9DDF6",
  "#F4C7C3",
  "#DCCFF3",
  "#F3E3A1",
  "#BFE3DA",
  "#F2CFE3",
];

const presenceColor: Record<Exclude<Presence, "none">, string> = {
  on: "bg-accent",
  off: "bg-faint",
  late: "bg-warn",
};

function colorFor(name: string) {
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return AVC[n % AVC.length]!;
}

/** 42×42 avatar with optional presence dot (prototype `.av`). */
export function Avatar({
  name,
  size = 42,
  presence = "none",
  round = false,
}: {
  name: string;
  size?: number;
  presence?: Presence;
  round?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
  const radius = round ? size / 2 : size > 36 ? 14 : 10;
  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: colorFor(name),
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          className="font-semibold"
          style={{ fontSize: size * 0.34, color: "#1b1b1b" }}
        >
          {initials}
        </Text>
      </View>
      {presence !== "none" ? (
        <View
          className={`absolute -bottom-0.5 -end-0.5 h-[11px] w-[11px] rounded-full border-2 border-surface ${presenceColor[presence]}`}
        />
      ) : null}
    </View>
  );
}
