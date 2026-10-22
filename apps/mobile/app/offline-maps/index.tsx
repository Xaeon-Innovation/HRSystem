import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Chip, Screen } from "@/components/ui";
import { fetchMapRegions } from "@/lib/map/api";
import {
  downloadPack,
  refreshStalePacks,
  useOfflinePacks,
} from "@/lib/map/offline-packs";

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OfflineMapsScreen() {
  const packs = useOfflinePacks((s) => s.packs);
  const hydrate = useOfflinePacks((s) => s.hydrate);
  const remove = useOfflinePacks((s) => s.remove);
  const totalBytes = useOfflinePacks((s) => s.totalBytes);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const autoDownloadZone = async () => {
    setBusyId("auto");
    setMsg(null);
    try {
      const regions = await fetchMapRegions();
      const region = regions.regions[0];
      if (!region) throw new Error("No work zone region from API");
      await downloadPack({
        id: region.id,
        name: region.name,
        bounds: region.bounds,
        minZoom: region.minZoom,
        maxZoom: region.maxZoom,
        styleURL: regions.styles.light,
      });
      setMsg("Work zone pack ready");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-text">Offline maps</Text>
      <Text className="mt-2 text-[13px] text-muted">
        Packs cache map tiles for clock-in and navigation without signal. Cap{" "}
        {formatBytes(500 * 1024 * 1024)} · used {formatBytes(totalBytes())}.
      </Text>

      <View className="mt-4 flex-col gap-2 sm:flex-row">
        <Button
          className="sm:flex-1"
          label={busyId === "auto" ? "Downloading…" : "Download work zone"}
          variant="accent"
          disabled={busyId != null}
          onPress={() => void autoDownloadZone()}
        />
        <Button
          className="sm:flex-1"
          label="Download another area"
          variant="line"
          disabled={busyId != null}
          onPress={() => router.push("/offline-maps/new")}
        />
      </View>

      <Button
        className="mt-2"
        label="Refresh packs older than 30 days"
        variant="soft"
        size="sm"
        onPress={() => {
          void refreshStalePacks().then((n) =>
            setMsg(n ? `${n} pack(s) queued for refresh` : "All packs are fresh"),
          );
        }}
      />

      {msg ? (
        <Text className="mt-3 text-[13px] text-muted">{msg}</Text>
      ) : null}

      <View className="mt-5 gap-3">
        {packs.length === 0 ? (
          <Card>
            <Text className="text-[13px] text-muted">
              No packs yet. Download your work zone on Wi‑Fi before a shift.
            </Text>
          </Card>
        ) : (
          packs.map((p) => (
            <Card key={p.id} className="gap-2">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="min-w-0 flex-1 text-[14px] font-semibold text-text">
                  {p.name}
                </Text>
                <Chip
                  label={p.status}
                  tone={
                    p.status === "ready"
                      ? "ok"
                      : p.status === "error"
                        ? "danger"
                        : "warn"
                  }
                />
              </View>
              <Text className="text-[12px] text-muted">
                z{p.minZoom}–{p.maxZoom} · {formatBytes(p.sizeBytes)}
                {p.status === "downloading"
                  ? ` · ${Math.round(p.progress * 100)}%`
                  : ""}
              </Text>
              {p.error ? (
                <Text className="text-[12px] text-danger">{p.error}</Text>
              ) : null}
              <View className="mt-1 flex-row gap-2">
                <Button
                  className="flex-1"
                  label="Delete"
                  variant="danger-soft"
                  size="sm"
                  onPress={() => void remove(p.id)}
                />
              </View>
            </Card>
          ))
        )}
      </View>

      <Button
        className="mt-6"
        label="Back"
        variant="soft"
        onPress={() => goBack()}
      />
    </Screen>
  );
}
