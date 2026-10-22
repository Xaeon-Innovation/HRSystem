import { router, useLocalSearchParams } from "expo-router";
import { goBack } from "@/lib/nav";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  IconChevronLeft,
  IconLocate,
  IconMap,
  IconTile,
  Screen,
} from "@/components/ui";
import { formatDistanceM } from "@/lib/format";
import { checkAgainstZone } from "@/lib/geo-check";
import { captureLocation } from "@/lib/location";
import { useSession } from "@/lib/session";

/**
 * Blocking screen for fixed-zone staff who are outside the work zone.
 * Device cannot override — only a fresh GPS fix that passes can leave.
 */
export default function OutsideScreen() {
  const params = useLocalSearchParams<{
    distanceM?: string;
    accuracyM?: string;
  }>();
  const me = useSession((s) => s.me);
  const zone = me?.zones[0];
  const [distanceM, setDistanceM] = useState(
    Number(params.distanceM) || null,
  );
  const [accuracyM, setAccuracyM] = useState(
    Number(params.accuracyM) || null,
  );
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const tryAgain = async () => {
    if (!zone) {
      setHint("No work zone is assigned. Contact your manager.");
      return;
    }
    setBusy(true);
    setHint(null);
    try {
      const fix = await captureLocation();
      const check = checkAgainstZone(fix, zone);
      setDistanceM(Math.round(check.distanceM));
      setAccuracyM(Math.round(fix.accuracyM));
      if (check.inside) {
        router.replace("/modal/clock-check");
        return;
      }
      setHint(
        check.effectiveDistanceM > zone.radiusMeters
          ? "Still outside the zone. Walk closer, then try again."
          : "GPS accuracy is too low. Move outdoors or wait for a better fix.",
      );
    } catch {
      setHint("Could not get a GPS fix. Check location permissions.");
    } finally {
      setBusy(false);
    }
  };

  const walkHintM =
    distanceM != null && zone
      ? Math.max(0, Math.round(distanceM - zone.radiusMeters))
      : null;

  return (
    <Screen>
      <View className="mb-1 flex-row items-center gap-2 pb-3">
        <Pressable
          onPress={() => goBack()}
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-line bg-surface"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <IconChevronLeft size={18} color="#121212" />
        </Pressable>
        <Text className="flex-1 text-center text-base font-semibold text-text">
          Clock in
        </Text>
        <View className="w-[42px]" />
      </View>

      <View className="mb-3 h-[220px] items-center justify-center overflow-hidden rounded-[18px] border border-line bg-surface-2">
        <View className="h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-accent bg-accent-tint/40">
          <IconLocate size={28} color="#6FA01B" />
        </View>
        <Text className="mt-3 text-[12px] font-semibold text-muted">
          {zone?.label ?? "Work zone"}
        </Text>
      </View>

      <View className="mb-3 flex-row gap-2.5 rounded-2xl bg-danger-soft px-3.5 py-3">
        <Text className="flex-1 text-[12.5px] leading-snug text-text-2">
          <Text className="font-semibold text-text">
            You&apos;re{" "}
            {distanceM != null ? formatDistanceM(distanceM) : "—"} outside{" "}
            {zone?.label ?? "the zone"}
          </Text>
          {"\n"}
          Move inside the dashed area to clock in.
        </Text>
      </View>

      <Card className="mb-3 p-4">
        <View className="flex-row items-center gap-3">
          <IconTile>
            <IconMap size={18} color="#121212" />
          </IconTile>
          <View className="min-w-0 flex-1">
            <Text className="text-[13.5px] font-semibold text-text">
              Walk to zone
            </Text>
            <Text className="mt-0.5 text-[11.5px] text-muted">
              {walkHintM != null && walkHintM > 0
                ? `About ${walkHintM} m to the edge`
                : "Get a fresh GPS fix"}
            </Text>
          </View>
        </View>
        <View className="mt-3 flex-row items-center gap-3 border-t border-line pt-3">
          <IconTile>
            <IconLocate size={18} color="#121212" />
          </IconTile>
          <View className="min-w-0 flex-1">
            <Text className="text-[13.5px] font-semibold text-text">
              GPS accuracy{" "}
              {accuracyM != null ? `±${accuracyM} m` : "…"}
            </Text>
            <Text className="mt-0.5 text-[11.5px] text-muted">
              Move to an open area for a better fix
            </Text>
          </View>
          {accuracyM != null ? (
            <Chip label={`±${accuracyM} m`} tone="line" />
          ) : null}
        </View>
      </Card>

      {hint ? (
        <Text className="mb-3 text-[13px] text-danger">{hint}</Text>
      ) : null}

      <View className="flex-row gap-2.5">
        <Button
          className="flex-1"
          label="Open map"
          variant="line"
          onPress={() => router.push("/(tabs)/map")}
        />
        <Button
          className="flex-1"
          label={busy ? "Checking…" : "Try again"}
          variant="ink"
          disabled={busy}
          onPress={() => void tryAgain()}
        />
      </View>
      <Text className="mt-3 text-center text-[11.5px] text-muted">
        Work outside zones? Ask your admin to set you as mobile.
      </Text>
    </Screen>
  );
}
