import { router, useLocalSearchParams } from "expo-router";
import { goBack } from "@/lib/nav";
import { Text, View } from "react-native";
import { Button, Card, Chip, Screen } from "@/components/ui";
import { useLeave } from "@/lib/hooks/use-leave";

export default function LeaveDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, cancelLeave, busy, error } = useLeave();
  const req = items.find((r) => r.id === id);

  if (!req) {
    return (
      <Screen>
        <Text className="text-xl font-semibold text-text">Request not found</Text>
        <Button className="mt-4" label="Back" variant="soft" onPress={() => goBack()} />
      </Screen>
    );
  }

  const canCancel =
    req.status === "pending" ||
    req.status === "draft" ||
    Boolean(req.pendingLocal);

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-text">Leave request</Text>
      <Card className="mt-4 gap-2">
        <Chip
          label={req.pendingLocal ? "Waiting to send" : req.status}
          tone={req.pendingLocal ? "warn" : "info"}
        />
        <Text className="text-[14px] font-semibold text-text">
          {req.typeId || "Leave"}
        </Text>
        <Text className="text-[13px] text-text-2">
          {req.startDate} → {req.endDate}
        </Text>
        <Text className="text-[12px] text-muted">Version {req.version}</Text>
        {error ? <Text className="text-[13px] text-danger">{error}</Text> : null}
      </Card>

      <Card className="mt-3 gap-1">
        <Text className="text-[12px] text-muted">Timeline</Text>
        <Text className="text-[13px] text-text">
          Created locally · sync applies server status when online.
        </Text>
      </Card>

      <View className="mt-5 gap-2">
        {canCancel ? (
          <Button
            label={busy ? "…" : "Cancel request"}
            variant="danger-soft"
            disabled={busy}
            onPress={() =>
              void cancelLeave(req.id).then((ok) => {
                if (ok) goBack();
              })
            }
          />
        ) : null}
        <Button label="Back" variant="soft" onPress={() => goBack()} />
      </View>
    </Screen>
  );
}
