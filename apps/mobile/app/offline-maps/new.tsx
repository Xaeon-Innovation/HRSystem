import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { useEffect, useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Screen, TextField } from "@/components/ui";
import { fetchMapRegions } from "@/lib/map/api";
import { downloadPack, estimatePackBytes } from "@/lib/map/offline-packs";

export default function OfflineMapPickerScreen() {
  const [name, setName] = useState("Custom area");
  const [lat, setLat] = useState("25.0805");
  const [lng, setLng] = useState("55.1403");
  const [radiusKm, setRadiusKm] = useState("2");
  const [styleURL, setStyleURL] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchMapRegions()
      .then((r) => {
        setStyleURL(r.styles.light);
        const zone = r.regions[0];
        if (zone) {
          const [[w, s], [e, n]] = zone.bounds;
          setLat(String(((s + n) / 2).toFixed(5)));
          setLng(String(((w + e) / 2).toFixed(5)));
        }
      })
      .catch(() => {
        /* keep defaults */
      });
  }, []);

  const bounds = useMemo(() => {
    const la = Number(lat);
    const ln = Number(lng);
    const km = Math.max(0.2, Number(radiusKm) || 2);
    const dLat = km / 111.32;
    const dLng = km / (111.32 * Math.cos((la * Math.PI) / 180));
    return [
      [ln - dLng, la - dLat],
      [ln + dLng, la + dLat],
    ] as [[number, number], [number, number]];
  }, [lat, lng, radiusKm]);

  const estimate = estimatePackBytes(bounds, 10, 16);

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      const id = `custom-${Date.now()}`;
      await downloadPack({
        id,
        name: name.trim() || "Custom area",
        bounds,
        minZoom: 10,
        maxZoom: 16,
        styleURL: styleURL || "https://tiles.openfreemap.org/styles/liberty",
      });
      router.replace("/offline-maps");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-text">Download area</Text>
      <Text className="mt-2 text-[13px] text-muted">
        Pick a center and radius. Estimated size uses zoom 10–16.
      </Text>

      <Card className="mt-4 gap-3">
        <TextField label="Name" value={name} onChangeText={setName} />
        <TextField
          label="Latitude"
          value={lat}
          onChangeText={setLat}
          keyboardType="decimal-pad"
        />
        <TextField
          label="Longitude"
          value={lng}
          onChangeText={setLng}
          keyboardType="decimal-pad"
        />
        <TextField
          label="Radius (km)"
          value={radiusKm}
          onChangeText={setRadiusKm}
          keyboardType="decimal-pad"
        />
        <Text className="text-[12px] text-muted">
          Estimate ~{(estimate / (1024 * 1024)).toFixed(1)} MB
        </Text>
        {error ? <Text className="text-[13px] text-danger">{error}</Text> : null}
      </Card>

      <View className="mt-5 gap-2">
        <Button
          label={busy ? "Downloading…" : "Start download"}
          variant="accent"
          disabled={busy}
          onPress={() => void start()}
        />
        <Button label="Cancel" variant="soft" onPress={() => goBack()} />
      </View>
    </Screen>
  );
}
