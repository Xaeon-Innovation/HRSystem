import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { Pressable, Text, View } from "react-native";
import {
  Card,
  Chip,
  EmptyState,
  IconBell,
  IconChevronLeft,
  IconTile,
  Screen,
  Segmented,
} from "@/components/ui";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { openNotificationDeepLink } from "@/lib/push";
import { useMemo, useState } from "react";

type Filter = "all" | "shifts" | "leave" | "tasks";

export default function AlertsScreen() {
  const { items, unread, loading, error, refresh, markRead, markAllRead } =
    useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((n) =>
      String(n.type).toLowerCase().includes(filter.slice(0, 4)),
    );
  }, [items, filter]);

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
          Alerts
        </Text>
        <Pressable
          onPress={() => void markAllRead()}
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-line bg-surface"
          style={{ alignItems: "center", justifyContent: "center" }}
          hitSlop={8}
        >
          <Text className="text-[11px] font-semibold text-muted">
            {unread || ""}
          </Text>
        </Pressable>
      </View>

      <Segmented
        options={[
          { id: "all", label: "All" },
          { id: "shifts", label: "Shifts" },
          { id: "leave", label: "Leave" },
          { id: "tasks", label: "Tasks" },
        ]}
        value={filter}
        onChange={setFilter}
        className="mb-3"
      />

      {error ? (
        <Text className="mb-2 text-[13px] text-danger">{error}</Text>
      ) : null}

      {filtered.length === 0 && !loading ? (
        <EmptyState
          title="No alerts"
          description="Shift changes, leave decisions, and task reviews land here."
        />
      ) : (
        <Card className="mb-4 p-4">
          {filtered.map((n, i) => (
            <Pressable
              key={n.id}
              onPress={() => {
                if (!n.read) void markRead(n.id);
                openNotificationDeepLink(n.type);
              }}
              className={`flex-row items-start gap-3 ${
                i > 0 ? "mt-3 border-t border-line pt-3" : ""
              }`}
              style={{ flexDirection: "row", alignItems: "flex-start" }}
            >
              <IconTile tone={n.read ? undefined : "tint"}>
                <IconBell size={18} color={n.read ? "#121212" : "#6FA01B"} />
              </IconTile>
              <View className="min-w-0 flex-1">
                <Text className="text-[13.5px] font-semibold text-text">
                  {n.title}
                </Text>
                <Text className="mt-0.5 text-[11.5px] text-muted" numberOfLines={2}>
                  {n.body}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[11px] text-muted">
                  {n.updatedAt
                    ? new Date(n.updatedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </Text>
                {!n.read ? (
                  <View className="mt-1.5 h-2 w-2 rounded-full bg-accent" />
                ) : null}
              </View>
            </Pressable>
          ))}
        </Card>
      )}

      <Pressable onPress={() => void refresh()}>
        <Chip
          label={loading ? "Refreshing…" : "Pull to refresh"}
          tone="line"
        />
      </Pressable>
    </Screen>
  );
}
