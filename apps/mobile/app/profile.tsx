import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import {
  Avatar,
  Button,
  Card,
  Chip,
  IconBell,
  IconChevronRight,
  IconHistory,
  IconLocate,
  IconMap,
  IconX,
  Screen,
} from "@/components/ui";
import { logoutRemote } from "@/lib/api";
import { registerForPushAsync } from "@/lib/push";
import { useSession } from "@/lib/session";
import { pendingOutboxCount } from "@/lib/sync/outbox";
import { useTheme } from "@/lib/theme";
import { stopTracking } from "@/lib/tracking";

function MenuRow({
  icon,
  label,
  meta,
  onPress,
  first,
  chevronColor,
}: {
  icon: ReactNode;
  label: string;
  meta?: string;
  onPress?: () => void;
  first?: boolean;
  chevronColor: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 py-3 ${
        first ? "" : "border-t border-line"
      }`}
      style={{ flexDirection: "row", alignItems: "center" }}
    >
      {icon}
      <Text className="flex-1 text-[14px] font-medium text-text">{label}</Text>
      {meta ? (
        <Text className="text-xs font-medium text-muted">{meta}</Text>
      ) : null}
      <IconChevronRight size={18} color={chevronColor} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const me = useSession((s) => s.me);
  const clearSession = useSession((s) => s.clearSession);
  const setOnboardingDone = useSession((s) => s.setOnboardingDone);
  const setWorkspace = useSession((s) => s.setWorkspace);
  const { theme, colors, setThemeOverride } = useTheme();
  const icon = colors.text;
  const [pending, setPending] = useState(0);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void pendingOutboxCount().then(setPending);
    void registerForPushAsync().then(setPushToken);
  }, []);

  const onSignOut = async () => {
    setBusy(true);
    setSignOutError(null);
    try {
      const n = await pendingOutboxCount();
      if (n > 0) {
        setSignOutError(
          `${n} event(s) still waiting to sync. Open Sync center, push, then sign out.`,
        );
        setBusy(false);
        return;
      }
      await stopTracking();
      await logoutRemote();
      await clearSession();
      await setOnboardingDone(false);
      await setWorkspace(null);
      router.replace("/(auth)/workspace");
    } catch (e) {
      setSignOutError(e instanceof Error ? e.message : "Sign out failed");
    } finally {
      setBusy(false);
    }
  };

  const zoneLabel = me?.zones[0]?.label ?? "Field";
  const canTeam =
    me?.role === "tenant_admin" ||
    me?.entitlements.liveMap ||
    (me?.managerOf ?? 0) > 0;

  return (
    <Screen>
      <View className="mb-1 flex-row items-center gap-2.5 pb-3.5 pt-1.5">
        <Text className="flex-1 text-2xl font-semibold tracking-tight text-text">
          Profile
        </Text>
        <Pressable
          onPress={() => goBack()}
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-line bg-surface"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <IconX size={18} color={icon} />
        </Pressable>
      </View>

      <Card className="mb-3">
        <View className="flex-row items-center gap-3">
          <Avatar name={me?.user.name ?? "?"} presence="on" />
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-text">
              {me?.user.name ?? "—"}
            </Text>
            <Text className="text-[12px] text-muted">
              {me?.role?.replace(/_/g, " ")} · {zoneLabel}
            </Text>
          </View>
          <Chip
            label={me?.presenceMode === "mobile" ? "Mobile" : "Fixed zone"}
            tone="line"
          />
        </View>
        <View className="my-3.5 h-px bg-line" />
        <View className="flex-row">
          <View className="flex-1 items-center">
            <Text className="text-[15px] font-semibold tabular-nums text-text">
              —
            </Text>
            <Text className="text-[11px] text-muted">On time</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-[15px] font-semibold tabular-nums text-text">
              —
            </Text>
            <Text className="text-[11px] text-muted">Leave days</Text>
          </View>
          <View className="flex-1 items-center">
            <Text className="text-[15px] font-semibold tabular-nums text-text">
              {pending}
            </Text>
            <Text className="text-[11px] text-muted">Queued</Text>
          </View>
        </View>
      </Card>

      <View className="mb-3 rounded-[20px] border border-line bg-surface px-3.5">
        <MenuRow
          first
          chevronColor={colors.faint}
          icon={<IconHistory size={18} color={icon} />}
          label="History"
          onPress={() => router.push("/history")}
        />
        <MenuRow
          chevronColor={colors.faint}
          icon={<IconBell size={18} color={icon} />}
          label="Alerts"
          onPress={() => router.push("/alerts")}
        />
        {canTeam ? (
          <MenuRow
            chevronColor={colors.faint}
            icon={<IconMap size={18} color={icon} />}
            label="Team today"
            onPress={() => router.push("/team")}
          />
        ) : null}
        <MenuRow
          chevronColor={colors.faint}
          icon={<IconHistory size={18} color={icon} />}
          label="Sync center"
          meta={pending ? `${pending} queued` : "Synced"}
          onPress={() => router.push("/sync")}
        />
        <MenuRow
          chevronColor={colors.faint}
          icon={<IconMap size={18} color={icon} />}
          label="Offline maps"
          onPress={() => router.push("/offline-maps")}
        />
        <MenuRow
          chevronColor={colors.faint}
          icon={<IconLocate size={18} color={icon} />}
          label="Location & privacy"
          onPress={() => router.push("/privacy")}
        />
      </View>

      <View className="mb-3 rounded-[20px] border border-line bg-surface px-3.5">
        <View className="flex-row items-center gap-3 py-3">
          <Text className="flex-1 text-[14px] font-medium text-text">
            Dark mode
          </Text>
          <Switch
            value={theme === "dark"}
            onValueChange={(on) => setThemeOverride(on ? "dark" : "light")}
            trackColor={{ false: colors.lineStrong, true: colors.accent }}
            thumbColor={colors.surface}
          />
        </View>
        <View className="flex-row items-center gap-3 border-t border-line py-3">
          <Text className="flex-1 text-[14px] font-medium text-text">
            Appearance
          </Text>
          <Text className="text-xs font-medium text-muted capitalize">
            {theme}
          </Text>
        </View>
        <View className="flex-row items-center gap-3 border-t border-line py-3">
          <Text className="flex-1 text-[14px] font-medium text-text">
            Workspace
          </Text>
          <Text className="text-xs font-medium text-muted">
            {me?.tenant.slug}
          </Text>
        </View>
        {pushToken ? (
          <Text className="border-t border-line py-3 text-[11px] text-muted">
            Push registered on this device
          </Text>
        ) : null}
      </View>

      {signOutError ? (
        <Text className="mb-2 text-[13px] text-danger">{signOutError}</Text>
      ) : null}

      <Button
        label={busy ? "Signing out…" : "Sign out"}
        variant="soft"
        disabled={busy}
        onPress={() => void onSignOut()}
      />
      <Text className="mt-3 text-center text-[11px] text-muted">
        Elevora · {me?.tenant.name ?? "—"}
      </Text>
    </Screen>
  );
}
