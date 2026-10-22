import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { Text, View } from "react-native";
import { Button, Card, Chip, EmptyState, Screen } from "@/components/ui";
import { useLeave } from "@/lib/hooks/use-leave";
import { useSession } from "@/lib/session";

export default function LeaveApprovalsScreen() {
  const me = useSession((s) => s.me);
  const { items, decideLeave, busy, error, refresh } = useLeave();
  const allowed =
    me?.role === "tenant_admin" ||
    me?.moduleRoles.includes("leaves") ||
    (me?.managerOf ?? 0) > 0;

  const queue = items.filter((r) => r.status === "pending" && !r.pendingLocal);

  if (!allowed) {
    return (
      <Screen>
        <EmptyState
          title="Approvals unavailable"
          description="Managers and leaves module roles can decide requests."
        />
        <Button className="mt-4" label="Back" variant="soft" onPress={() => goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-text">Leave approvals</Text>
      <Text className="mt-2 text-[13px] text-muted">
        Approve, reject, or return with a note. Decisions sync via the outbox.
      </Text>

      {error ? <Text className="mt-2 text-[13px] text-danger">{error}</Text> : null}

      <View className="mt-4 gap-3">
        {queue.length === 0 ? (
          <EmptyState
            title="Inbox clear"
            description="No pending requests to decide."
          />
        ) : (
          queue.map((r) => (
            <Card key={r.id} className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-semibold text-text">
                  {r.typeId}
                </Text>
                <Chip label={r.status} tone="warn" />
              </View>
              <Text className="text-[12px] text-muted">
                {r.startDate} → {r.endDate}
              </Text>
              <View className="mt-1 flex-col gap-2 sm:flex-row">
                <Button
                  className="sm:flex-1"
                  label="Approve"
                  variant="accent"
                  size="sm"
                  disabled={busy}
                  onPress={() => void decideLeave(r.id, "approve").then(() => refresh())}
                />
                <Button
                  className="sm:flex-1"
                  label="Return"
                  variant="line"
                  size="sm"
                  disabled={busy}
                  onPress={() =>
                    void decideLeave(r.id, "return", "Revisions needed").then(
                      () => refresh(),
                    )
                  }
                />
                <Button
                  className="sm:flex-1"
                  label="Reject"
                  variant="danger-soft"
                  size="sm"
                  disabled={busy}
                  onPress={() => void decideLeave(r.id, "reject").then(() => refresh())}
                />
              </View>
            </Card>
          ))
        )}
      </View>

      <Button className="mt-6" label="Back" variant="soft" onPress={() => goBack()} />
    </Screen>
  );
}
