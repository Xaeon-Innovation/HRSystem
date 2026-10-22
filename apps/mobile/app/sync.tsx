import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  IconChevronLeft,
  IconTile,
  Screen,
  SectionLabel,
} from "@/components/ui";
import { isLocalDbAvailable } from "@/lib/db/client";
import { useOutbox } from "@/lib/hooks/use-outbox";
import { runSyncCycle } from "@/lib/sync/engine";

export default function SyncCenterScreen() {
  const { pending, rows, busy, error, refresh, push, discard, retry } =
    useOutbox();
  const [cycleMsg, setCycleMsg] = useState<string | null>(null);
  const [cycling, setCycling] = useState(false);

  const queued = rows.filter(
    (r) => r.status === "pending" || r.status === "sending",
  );
  const conflicts = rows.filter((r) => r.status === "conflict");
  const rejected = rows.filter((r) => r.status === "rejected");

  const onFullSync = async () => {
    setCycling(true);
    setCycleMsg(null);
    try {
      const result = await runSyncCycle();
      setCycleMsg(
        result.error
          ? result.error
          : `Pushed ${result.pushed} · pulled ${result.pulled} · pending ${result.pending}`,
      );
      await refresh();
    } finally {
      setCycling(false);
    }
  };

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
          Sync center
        </Text>
        <View className="w-[42px]" />
      </View>

      <Card className="mb-1">
        <View className="flex-row items-center gap-2.5">
          <IconTile tone={pending ? "warn" : "tint"}>
            <Text className="text-[13px] font-bold text-accent-ink">
              {pending || "✓"}
            </Text>
          </IconTile>
          <View className="min-w-0 flex-1">
            <Text className="text-[15px] font-semibold text-text">
              {pending ? `${pending} waiting to send` : "All synced"}
            </Text>
            <Text className="mt-0.5 text-[12px] text-muted">
              {cycleMsg ??
                (isLocalDbAvailable
                  ? "Local SQLite + outbox"
                  : "Web preview · in-memory outbox")}
            </Text>
          </View>
        </View>
        <Button
          className="mt-3"
          label={cycling ? "Syncing…" : "Sync now"}
          variant="ink"
          disabled={busy || cycling}
          onPress={() => void onFullSync()}
        />
      </Card>

      {(error || cycleMsg) && error ? (
        <Text className="mt-2 text-[13px] text-danger">{error}</Text>
      ) : null}

      <SectionLabel>Waiting to send</SectionLabel>
      <Card className="mb-1 p-4">
        {queued.length === 0 ? (
          <Text className="text-[12.5px] text-muted">Outbox is clear.</Text>
        ) : (
          queued.map((row, i) => (
            <View
              key={row.id}
              className={`flex-row items-center gap-3 ${
                i > 0 ? "mt-3 border-t border-line pt-3" : ""
              }`}
            >
              <View className="min-w-0 flex-1">
                <Text className="text-[13.5px] font-semibold text-text">
                  {row.type}
                </Text>
                <Text className="mt-0.5 text-[11.5px] text-muted" numberOfLines={1}>
                  {row.aggregateKey}
                </Text>
              </View>
              <Chip label="Queued" tone="warn" />
            </View>
          ))
        )}
      </Card>

      {(conflicts.length > 0 || rejected.length > 0) && (
        <>
          <SectionLabel>Needs your attention</SectionLabel>
          <Card className="mb-1 gap-3 p-4">
            {conflicts.map((row) => (
              <View key={row.id} className="gap-2">
                <Text className="text-[14px] font-semibold text-text">
                  {row.type}
                </Text>
                <Text className="text-[12px] text-muted">
                  {row.lastError ?? "Conflict with server version"}
                </Text>
                <View className="flex-row gap-2">
                  <Button
                    className="flex-1"
                    label="Keep web version"
                    variant="line"
                    size="sm"
                    onPress={() => void discard(row.id)}
                  />
                  <Button
                    className="flex-1"
                    label="Re-apply mine"
                    variant="ink"
                    size="sm"
                    onPress={() => void retry(row.id)}
                  />
                </View>
              </View>
            ))}
            {rejected.map((row) => (
              <View
                key={row.id}
                className="flex-row items-center justify-between gap-2"
              >
                <Text className="min-w-0 flex-1 text-[13px] text-text">
                  {row.type}
                </Text>
                <Chip
                  label={row.lastError?.slice(0, 28) ?? "rejected"}
                  tone="danger"
                />
              </View>
            ))}
          </Card>
        </>
      )}

      <SectionLabel>Recent</SectionLabel>
      <Card className="mb-4 p-4">
        {rows.slice(0, 8).map((row, i) => (
          <View
            key={row.id}
            className={`flex-row items-center justify-between gap-2 ${
              i > 0 ? "mt-3 border-t border-line pt-3" : ""
            }`}
          >
            <View className="min-w-0 flex-1">
              <Text className="text-[12px] font-semibold text-text">
                {row.type}
              </Text>
              <Text className="text-[10px] text-muted" numberOfLines={1}>
                {row.occurredAt}
              </Text>
            </View>
            <Chip
              label={row.status}
              tone={
                row.status === "applied"
                  ? "ok"
                  : row.status === "conflict" || row.status === "rejected"
                    ? "danger"
                    : "warn"
              }
            />
          </View>
        ))}
        {rows.length === 0 ? (
          <Text className="text-[12px] text-muted">No events yet.</Text>
        ) : null}
      </Card>

      <Button
        label={busy ? "Pushing…" : "Push outbox only"}
        variant="line"
        disabled={busy || cycling}
        onPress={() => void push()}
      />
      <Text className="mt-3 text-center font-mono text-[11.5px] text-muted">
        outbox · {isLocalDbAvailable ? "sqlite" : "memory"}
      </Text>
    </Screen>
  );
}
