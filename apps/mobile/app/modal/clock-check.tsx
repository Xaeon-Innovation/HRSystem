import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  IconLocate,
  IconTile,
  Screen,
} from "@/components/ui";
import { checkAgainstZone } from "@/lib/geo-check";
import { useToday } from "@/lib/hooks/use-today";
import { useAppI18n } from "@/lib/i18n";
import {
  captureClockLocation,
  captureLocation,
  type CapturedLocation,
} from "@/lib/location";

export default function ClockCheckModal() {
  const { t } = useAppI18n();
  const {
    me,
    clockState,
    syncing,
    error,
    queueClockIn,
    queueClockOut,
    queueBreakStart,
    queueBreakEnd,
  } = useToday();
  const [fix, setFix] = useState<CapturedLocation | null>(null);
  const [locError, setLocError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setFix(
          Platform.OS === "web"
            ? await captureClockLocation()
            : await captureLocation(),
        );
      } catch {
        setLocError("Could not get GPS fix");
      }
    })();
  }, []);

  const zone = me?.zones[0];
  const inside = fix && zone ? checkAgainstZone(fix, zone) : null;

  const blockOutside =
    clockState === "off" &&
    me?.presenceMode === "fixed_zone" &&
    Platform.OS !== "web" &&
    inside != null &&
    !inside.inside;

  useEffect(() => {
    if (!blockOutside || !inside || !fix) return;
    router.replace({
      pathname: "/outside",
      params: {
        distanceM: String(Math.round(inside.distanceM)),
        accuracyM: String(Math.round(fix.accuracyM)),
      },
    });
  }, [blockOutside, inside, fix]);

  const run = async (action: () => Promise<boolean>) => {
    if (blockOutside && inside && fix) {
      router.replace({
        pathname: "/outside",
        params: {
          distanceM: String(Math.round(inside.distanceM)),
          accuracyM: String(Math.round(fix.accuracyM)),
        },
      });
      return;
    }
    const ok = await action();
    if (ok) goBack();
  };

  const checks = [
    {
      ok: Boolean(fix),
      title: fix ? "Location found" : "Getting GPS…",
      sub: fix
        ? `GPS ±${Math.round(fix.accuracyM)} m · ${fix.lat.toFixed(4)}, ${fix.lng.toFixed(4)}`
        : "Waiting for a fix…",
    },
    {
      ok: Boolean(inside?.inside),
      title: inside
        ? inside.inside
          ? `Inside ${zone?.label ?? "zone"}`
          : `Outside ${zone?.label ?? "zone"}`
        : zone
          ? "Checking zone…"
          : "No geofence",
      sub: inside
        ? `${Math.round(inside.distanceM)} m from center · radius ${zone?.radiusMeters ?? "—"} m`
        : "Comparing against your work zone",
    },
    {
      ok: Boolean(fix && !fix.mocked),
      title: fix?.mocked ? "Preview location" : "Real location",
      sub: fix?.mocked
        ? "Web preview snapped to zone center"
        : "No mock location detected",
    },
  ];

  return (
    <Screen>
      <View className="mb-2 h-1.5 w-10 self-center rounded-full bg-line-strong" />
      <Text className="text-[20px] font-semibold tracking-tight text-text">
        {clockState === "off" ? "Clocking you in" : "Clock check"}
      </Text>
      <Text className="mt-1 text-[13px] text-muted">
        Checking your location against {zone?.label ?? "your work zone"}.
      </Text>

      <View className="mt-4 h-[150px] items-center justify-center overflow-hidden rounded-[18px] border border-line bg-surface-2">
        <View className="h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-accent bg-accent-tint">
          <IconLocate size={26} color="#6FA01B" />
        </View>
        <Chip
          label={Platform.OS === "web" ? "Preview" : "Live"}
          tone="line"
        />
      </View>

      <Card className="mt-3 p-4">
        {checks.map((c, i) => (
          <View
            key={c.title}
            className={`flex-row items-center gap-3 ${
              i > 0 ? "mt-3 border-t border-line pt-3" : ""
            }`}
          >
            <IconTile tone={c.ok ? "tint" : undefined}>
              <Text className="text-[12px] font-bold text-accent-ink">
                {c.ok ? "✓" : "…"}
              </Text>
            </IconTile>
            <View className="min-w-0 flex-1">
              <Text className="text-[13.5px] font-semibold text-text">
                {c.title}
              </Text>
              <Text className="mt-0.5 text-[11.5px] text-muted">{c.sub}</Text>
            </View>
          </View>
        ))}
        {(locError || error) && (
          <Text className="mt-3 text-[13px] text-danger">
            {locError ?? error}
          </Text>
        )}
      </Card>

      <View className="mt-4 gap-2">
        {clockState === "off" && (
          <Button
            label={syncing ? "Sending…" : "Done"}
            variant="ink"
            disabled={syncing || blockOutside || !fix}
            onPress={() => void run(queueClockIn)}
          />
        )}
        {clockState === "on" && (
          <>
            <Button
              label={syncing ? "…" : t("app.clock.breakStart")}
              variant="line"
              disabled={syncing}
              onPress={() => void run(queueBreakStart)}
            />
            <Button
              label={syncing ? "…" : t("app.clock.out")}
              variant="ink"
              disabled={syncing}
              onPress={() => void run(queueClockOut)}
            />
          </>
        )}
        {clockState === "break" && (
          <Button
            label={syncing ? "…" : t("app.clock.breakEnd")}
            variant="accent"
            disabled={syncing}
            onPress={() => void run(queueBreakEnd)}
          />
        )}
        <Button label="Cancel" variant="soft" onPress={() => goBack()} />
      </View>
    </Screen>
  );
}
