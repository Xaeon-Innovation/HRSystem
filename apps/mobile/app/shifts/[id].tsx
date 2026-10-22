import { router, useLocalSearchParams } from "expo-router";
import { goBack } from "@/lib/nav";
import { Text, View } from "react-native";
import { Button, Card, Chip, Screen } from "@/components/ui";
import { useShifts } from "@/lib/hooks/use-shifts";
import { useSession } from "@/lib/session";

export default function ShiftDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items } = useShifts();
  const me = useSession((s) => s.me);
  const shift = items.find((s) => s.id === id);

  if (!shift) {
    return (
      <Screen>
        <Text className="text-xl font-semibold text-text">Shift not found</Text>
        <Button className="mt-4" label="Back" variant="soft" onPress={() => goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-text">Shift</Text>
      <Text className="mt-1 text-[13px] text-muted">{shift.workDate}</Text>

      <Card className="mt-4 gap-2">
        <View className="flex-row flex-wrap gap-2">
          <Chip label={shift.status} tone="ok" />
          {shift.lateClockIn ? <Chip label="Late clock-in" tone="warn" /> : null}
          {shift.overtimeStatus ? (
            <Chip label={`Overtime · ${shift.overtimeStatus}`} tone="info" />
          ) : null}
        </View>
        <Text className="text-[13px] text-text-2">
          {new Date(shift.startAt).toLocaleString()} →{" "}
          {new Date(shift.endAt).toLocaleString()}
        </Text>
        <Text className="text-[12px] text-muted">
          Presence {me?.presenceMode ?? "—"} · zone{" "}
          {me?.zones[0]?.label ?? "none"}
        </Text>
      </Card>

      <Card className="mt-3 gap-1">
        <Text className="text-[12px] text-muted">Timeline</Text>
        <Text className="text-[13px] text-text">
          Window and break grace come from the published roster. Clock events
          sync via the outbox on Today.
        </Text>
      </Card>

      <View className="mt-5 gap-2">
        <Button
          label="Go to Today"
          variant="accent"
          onPress={() => router.replace("/(tabs)")}
        />
        <Button label="Back" variant="soft" onPress={() => goBack()} />
      </View>
    </Screen>
  );
}
