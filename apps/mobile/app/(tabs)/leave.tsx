import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  Hatch,
  IconPlus,
  IconTile,
  IconTreePalm,
  Screen,
  SectionLabel,
} from "@/components/ui";
import { useLeave } from "@/lib/hooks/use-leave";
import { useAppI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

function toneFor(status: string) {
  if (status === "approved") return "ok" as const;
  if (status === "rejected" || status === "cancelled") return "danger" as const;
  if (status === "returned" || status === "pending") return "warn" as const;
  return "info" as const;
}

function prettyStatus(status: string) {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export default function LeaveScreen() {
  const { t } = useAppI18n();
  const me = useSession((s) => s.me);
  const { items, loading, error, refresh } = useLeave();
  const canApprove =
    me?.role === "tenant_admin" ||
    me?.moduleRoles.includes("leaves") ||
    (me?.managerOf ?? 0) > 0;

  const pendingCount = items.filter(
    (r) => r.status === "pending" || r.pendingLocal,
  ).length;

  return (
    <Screen>
      <View className="mb-1 flex-row items-center gap-2.5 pb-3.5 pt-1.5">
        <Text className="flex-1 text-2xl font-semibold tracking-tight text-text">
          {t("app.tabs.leave")}
        </Text>
        <Pressable
          onPress={() => router.push("/leave/new")}
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-line bg-surface"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <IconPlus size={18} color="#121212" />
        </Pressable>
      </View>

      {/* Ink balance hero — prototype annual leave card */}
      <View className="relative mb-3 overflow-hidden rounded-card bg-ink px-4 py-4">
        <View
          className="absolute -end-10 -top-10 h-40 w-40 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
        />
        <Text className="text-[12px] text-ink-text opacity-70">
          Annual leave left
        </Text>
        <Text className="mt-2 text-[34px] font-semibold tracking-tight text-ink-text">
          —{" "}
          <Text className="text-base opacity-60">of — days</Text>
        </Text>
        <View className="mt-3 h-[22px] overflow-hidden rounded-lg bg-white/10">
          <Hatch tone="accent" className="h-full w-[40%]" />
        </View>
        <View className="mt-2 flex-row justify-between">
          <Text className="text-[11.5px] text-ink-text opacity-70">
            {pendingCount} pending
          </Text>
          <Text className="text-[11.5px] text-ink-text opacity-70">
            Sync for balances
          </Text>
        </View>
      </View>

      <View className="mb-1 flex-row gap-2">
        {(
          [
            ["Sick", "—", "—"],
            ["Comp.", "—", "—"],
            ["WFH", "—", "—"],
          ] as const
        ).map(([name, a, b]) => (
          <Card key={name} className="flex-1 p-3">
            <Text className="text-[11.5px] text-muted">{name}</Text>
            <Text className="mt-1 text-[22px] font-semibold tabular-nums tracking-tight text-text">
              {a}
              <Text className="text-xs text-muted">/{b}</Text>
            </Text>
          </Card>
        ))}
      </View>

      <Button
        className="mt-3"
        label={t("app.today.requestLeave")}
        variant="ink"
        onPress={() => router.push("/leave/new")}
      />

      {canApprove ? (
        <Button
          className="mt-2"
          label="Team approvals"
          variant="line"
          onPress={() => router.push("/leave/approvals")}
        />
      ) : null}

      {error ? (
        <Text className="mt-2 text-[13px] text-danger">{error}</Text>
      ) : null}

      <SectionLabel
        action={loading ? "…" : "Refresh"}
        onAction={() => void refresh()}
      >
        Requests
      </SectionLabel>

      {items.length === 0 && !loading ? (
        <EmptyState
          title="No leave requests"
          description="Create one offline — it stays as Waiting to send until sync."
        />
      ) : (
        <Card className="mb-4 p-4">
          {items.map((r, i) => (
            <Pressable
              key={r.id}
              onPress={() => router.push(`/leave/${r.id}`)}
              className={`flex-row items-center gap-3 ${
                i > 0 ? "mt-3 border-t border-line pt-3" : ""
              }`}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <IconTile tone="tint">
                <IconTreePalm size={18} color="#6FA01B" />
              </IconTile>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[13.5px] font-semibold text-text"
                  numberOfLines={1}
                >
                  {r.typeId || "Leave"} · {r.startDate}
                  {r.endDate && r.endDate !== r.startDate
                    ? `–${r.endDate.slice(5)}`
                    : ""}
                </Text>
                <Text className="mt-0.5 text-[11.5px] text-muted">
                  {r.pendingLocal ? "Waiting to send" : prettyStatus(r.status)}
                </Text>
              </View>
              <Chip
                label={
                  r.pendingLocal ? "Queued" : prettyStatus(String(r.status))
                }
                tone={r.pendingLocal ? "warn" : toneFor(String(r.status))}
              />
            </Pressable>
          ))}
        </Card>
      )}
    </Screen>
  );
}
