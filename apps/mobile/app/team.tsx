import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Chip, EmptyState, Screen } from "@/components/ui";
import type { TeamMember } from "@/lib/map/api";
import { subscribeTeamFeed, type TeamFeedStatus } from "@/lib/map/team-feed";
import { useSession } from "@/lib/session";

export default function TeamScreen() {
  const me = useSession((s) => s.me);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [status, setStatus] = useState<TeamFeedStatus>("idle");

  const allowed =
    me?.role === "tenant_admin" ||
    me?.entitlements.teamToday ||
    (me?.managerOf ?? 0) > 0;

  useEffect(() => {
    if (!allowed) return;
    return subscribeTeamFeed((next, feed) => {
      setMembers(next);
      setStatus(feed);
    });
  }, [allowed]);

  if (!allowed) {
    return (
      <Screen>
        <EmptyState
          title="Team today"
          description="Managers and admins see who is on shift and last known location."
        />
        <Button className="mt-4" label="Back" variant="soft" onPress={() => goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-2xl font-semibold text-text">Team today</Text>
        <Chip
          label={
            status === "live"
              ? "Live"
              : status === "polling"
                ? "Polling"
                : status === "offline"
                  ? "Offline"
                  : "…"
          }
          tone={status === "live" ? "ok" : status === "offline" ? "danger" : "warn"}
        />
      </View>

      <Button
        className="mb-4"
        label="Open team map"
        variant="line"
        size="sm"
        onPress={() => router.push("/(tabs)/map")}
      />

      {members.length === 0 ? (
        <EmptyState
          title="No teammates"
          description="Direct reports appear here when presence data is available."
        />
      ) : (
        <View className="gap-2">
          {members.map((m) => (
            <Card key={m.employeeId} className="gap-1">
              <View className="flex-row items-center justify-between gap-2">
                <Text className="min-w-0 flex-1 text-[14px] font-semibold text-text">
                  {m.name}
                </Text>
                <Chip
                  label={m.isClockedIn ? "On shift" : "Off"}
                  tone={m.isClockedIn ? "ok" : "line"}
                />
              </View>
              <Text className="text-[12px] text-muted">
                {m.lat != null && m.lng != null
                  ? `${m.lat.toFixed(4)}, ${m.lng.toFixed(4)}`
                  : "No location"}
                {m.updatedAt
                  ? ` · ${new Date(m.updatedAt).toLocaleTimeString()}`
                  : ""}
              </Text>
            </Card>
          ))}
        </View>
      )}

      <Button className="mt-6" label="Back" variant="soft" onPress={() => goBack()} />
    </Screen>
  );
}
