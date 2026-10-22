import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Chip, Screen } from "@/components/ui";
import { useToday } from "@/lib/hooks/use-today";
import { captureClockLocation } from "@/lib/location";
import { cancelOvertimePrompts } from "@/lib/overtime-notify";
import { runSyncCycle } from "@/lib/sync/engine";
import { enqueueOutbox } from "@/lib/sync/outbox";
import { stopTracking } from "@/lib/tracking";

export default function OvertimeModal() {
  const { queueClockOut, syncing, error } = useToday();
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const finish = async (type: "overtime.stay" | "overtime.decline") => {
    setBusy(true);
    setLocalError(null);
    try {
      const location = await captureClockLocation();
      await enqueueOutbox({ type, location });
      const cycle = await runSyncCycle();
      if (cycle.error) throw new Error(cycle.error);
      await cancelOvertimePrompts();
      if (type === "overtime.decline") {
        await stopTracking();
      }
      goBack();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not save choice");
    } finally {
      setBusy(false);
    }
  };

  const clockOut = async () => {
    setBusy(true);
    setLocalError(null);
    try {
      const ok = await queueClockOut();
      if (!ok) throw new Error(error ?? "Clock out failed");
      await cancelOvertimePrompts();
      goBack();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Clock out failed");
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || syncing;

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-text">Shift ending</Text>
      <Text className="mt-2 text-[13.5px] text-muted">
        Your scheduled shift is over. Stay for overtime, decline, or clock out
        now. Works offline — the choice syncs when you are back online.
      </Text>

      <Card className="mt-5 gap-2">
        <Chip label="Overtime window" tone="warn" />
        <Text className="text-[13px] text-text-2">
          Staying keeps tracking on. Declining or clocking out stops location
          updates for this shift.
        </Text>
        {(localError || error) && (
          <Text className="text-[13px] text-danger">{localError ?? error}</Text>
        )}
      </Card>

      <View className="mt-5 gap-2">
        <Button
          label={disabled ? "Saving…" : "Stay for overtime"}
          variant="accent"
          disabled={disabled}
          onPress={() => void finish("overtime.stay")}
        />
        <Button
          label="Decline overtime"
          variant="line"
          disabled={disabled}
          onPress={() => void finish("overtime.decline")}
        />
        <Button
          label="Clock out"
          variant="ink"
          disabled={disabled}
          onPress={() => void clockOut()}
        />
        <Button
          label="Not now"
          variant="soft"
          disabled={disabled}
          onPress={() => goBack()}
        />
      </View>
    </Screen>
  );
}
