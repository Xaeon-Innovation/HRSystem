import { Text, View } from "react-native";
import { formatDistanceM } from "@/lib/format";
import type { ElevoraMapProps } from "./types";

/**
 * Native placeholder until `@maplibre/maplibre-react-native` is linked in a
 * development build. Same props as the web MapLibre map.
 */
export function ElevoraMap({
  center,
  zone,
  markers = [],
  className = "",
}: ElevoraMapProps) {
  return (
    <View
      className={`min-h-[280px] flex-1 justify-center rounded-2xl border border-line bg-surface-2 px-4 ${className}`}
    >
      <Text className="text-[14px] font-semibold text-text">Map preview</Text>
      <Text className="mt-1 text-[12px] text-muted">
        MapLibre native module ships in the Elevora Field dev build. Center{" "}
        {center.lat.toFixed(4)}, {center.lng.toFixed(4)}.
      </Text>
      {zone ? (
        <Text className="mt-2 text-[12px] text-text-2">
          Zone radius {formatDistanceM(zone.radiusMeters)}
        </Text>
      ) : null}
      <Text className="mt-2 text-[12px] text-muted">
        {markers.length} marker{markers.length === 1 ? "" : "s"}
      </Text>
    </View>
  );
}
