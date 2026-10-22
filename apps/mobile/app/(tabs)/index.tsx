import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  AppHeader,
  Button,
  Card,
  Chip,
  ClockButton,
  ClockRing,
  IconCalendarClock,
  IconChevronRight,
  IconClipboardCheck,
  IconCoffee,
  IconHistory,
  IconListChecks,
  IconLocate,
  IconMap,
  IconPackage,
  IconRadio,
  IconSun,
  IconTile,
  IconTreePalm,
  KvStats,
  OfflineBanner,
  Screen,
  SectionLabel,
  SyncPill,
} from "@/components/ui";
import { formatDistanceM } from "@/lib/format";
import { useOutbox } from "@/lib/hooks/use-outbox";
import { useShifts } from "@/lib/hooks/use-shifts";
import { countActiveTasks, isActiveTask, useTasks } from "@/lib/hooks/use-tasks";
import { useToday } from "@/lib/hooks/use-today";
import { useAppI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] || full;
}

function greetingFor(name: string) {
  const hour = new Date().getHours();
  const part =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return `${part}, ${firstName(name)}`;
}

function fmtHm(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

/** Prototype elapsed: large HH:MM + muted :SS */
function elapsedParts(clockInAt: string | null | undefined): {
  hhmm: string;
  ss: string;
  progress: number;
} {
  if (!clockInAt) return { hhmm: "00:00", ss: "00", progress: 0 };
  const start = new Date(clockInAt).getTime();
  if (!Number.isFinite(start)) return { hhmm: "00:00", ss: "00", progress: 0 };
  const ms = Math.max(0, Date.now() - start);
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const ss = String(s).padStart(2, "0");
  const progress = Math.min(1, ms / (8.5 * 3600_000));
  return { hhmm, ss, progress };
}

export default function TodayScreen() {
  const { t } = useAppI18n();
  const workspace = useSession((s) => s.workspace);
  const {
    me,
    clockState,
    sessionJson,
    loading,
    syncing,
    error,
    lastLocationLabel,
    trackingActive,
    zoneStatus,
    needsBgDisclosure,
    queueClockOut,
    queueBreakStart,
    queueBreakEnd,
  } = useToday();
  const { items: tasks } = useTasks();
  const { today: todayShift } = useShifts();
  const { rows: outbox } = useOutbox();
  const [now, setNow] = useState(() => Date.now());
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (clockState === "off") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [clockState]);

  useEffect(() => {
    // Web / RN NetInfo-lite: navigator.onLine when available
    const nav = typeof navigator !== "undefined" ? navigator : null;
    if (!nav || typeof nav.onLine !== "boolean") return;
    const sync = () => setOnline(nav.onLine);
    sync();
    window.addEventListener?.("online", sync);
    window.addEventListener?.("offline", sync);
    return () => {
      window.removeEventListener?.("online", sync);
      window.removeEventListener?.("offline", sync);
    };
  }, []);

  const displayName = me?.user.name ?? "Teammate";
  const tenantName = me?.tenant.name ?? workspace?.name ?? "Workspace";
  const zoneLabel = me?.zones[0]?.label ?? "Work zone";
  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString(undefined, {
        weekday: "short",
        day: "numeric",
        month: "short",
      }),
    [],
  );

  const shiftWindow =
    todayShift?.startAt && todayShift?.endAt
      ? `${fmtHm(todayShift.startAt)} – ${fmtHm(todayShift.endAt)}`
      : "—";

  const shiftHours = useMemo(() => {
    if (!todayShift?.startAt || !todayShift?.endAt) return "—";
    const ms =
      new Date(todayShift.endAt).getTime() -
      new Date(todayShift.startAt).getTime();
    if (!Number.isFinite(ms) || ms <= 0) return "—";
    const h = Math.round(ms / 3600_000);
    return `${h}h`;
  }, [todayShift]);

  const clockInAt =
    typeof sessionJson?.clockInAt === "string"
      ? sessionJson.clockInAt
      : sessionJson?.clockInAt instanceof Date
        ? sessionJson.clockInAt.toISOString()
        : null;
  const { hhmm, ss, progress: workedProgress } = useMemo(
    () => elapsedParts(clockInAt),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clockInAt, now],
  );

  const queued = outbox.filter((r) => r.status === "pending").length;

  const zoneChipLabel = zoneStatus
    ? zoneStatus.inside
      ? `Inside zone · ${formatDistanceM(zoneStatus.distanceM)}`
      : `Outside · ${formatDistanceM(zoneStatus.distanceM)}`
    : zoneLabel;

  const openClock = () => {
    if (
      clockState === "off" &&
      me?.presenceMode === "fixed_zone" &&
      zoneStatus &&
      !zoneStatus.inside
    ) {
      router.push({
        pathname: "/outside",
        params: { distanceM: String(Math.round(zoneStatus.distanceM)) },
      });
      return;
    }
    router.push("/modal/clock-check");
  };

  const openTaskCount = countActiveTasks(tasks);
  const upNext = tasks.filter((x) => isActiveTask(x.status)).slice(0, 2);

  const presence =
    clockState === "off" ? ("off" as const) : ("on" as const);

  return (
    <Screen>
      <AppHeader
        name={displayName}
        greeting={greetingFor(displayName)}
        subtitle={`${tenantName} · ${zoneLabel}`}
        presence={presence}
        onAvatarPress={() => router.push("/profile")}
        onAlertsPress={() => router.push("/alerts")}
      />

      {!online ? (
        <OfflineBanner queued={queued} onPress={() => router.push("/sync")} />
      ) : null}

      {needsBgDisclosure && clockState !== "off" ? (
        <Pressable
          onPress={() => router.push("/location-disclosure")}
          className="mb-3 rounded-[16px] border border-line bg-surface px-3.5 py-3"
        >
          <Text className="text-[13px] font-semibold text-text">
            Enable on-shift location
          </Text>
          <Text className="mt-1 text-[12px] leading-snug text-muted">
            Allow location all the time so Elevora can track your route while
            you work. Tap to review and continue.
          </Text>
        </Pressable>
      ) : null}

      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-text">{dateLabel}</Text>
        <Pressable onPress={() => router.push("/sync")}>
          <SyncPill
            label={
              error
                ? "Sync issue"
                : !online
                  ? `Offline · ${queued} queued`
                  : loading || syncing
                    ? "Syncing…"
                    : "Synced · just now"
            }
            tone={
              error
                ? "error"
                : !online || loading || syncing
                  ? "pending"
                  : "ok"
            }
          />
        </Pressable>
      </View>

      {clockState === "off" ? (
        <Card className="mb-3 p-3.5">
          <Pressable
            className="flex-row items-center gap-3"
            onPress={() =>
              todayShift
                ? router.push(`/shifts/${todayShift.id}`)
                : router.push("/shifts")
            }
            style={{ flexDirection: "row", alignItems: "center" }}
          >
            <IconTile tone="tint">
              <IconSun size={18} color="#6FA01B" />
            </IconTile>
            <View className="min-w-0 flex-1">
              <Text className="text-[14px] font-semibold text-text">
                {t("app.today.shiftTitle")} · {zoneLabel}
              </Text>
              <Text className="mt-0.5 text-[12px] text-muted">
                {me?.presenceMode === "mobile" ? "Mobile presence" : "Fixed zone"}
                {todayShift ? ` · ${shiftWindow}` : ""}
              </Text>
            </View>
            <IconChevronRight size={18} color="#8E8E89" />
          </Pressable>
        </Card>
      ) : null}

      <Card className="mb-1 items-center px-4 py-[22px]">
        <View className="mb-1 w-full flex-row flex-wrap items-center justify-between gap-2">
          {clockState === "off" ? (
            <>
              <Chip
                label={shiftWindow}
                tone="line"
                icon={<IconCalendarClock size={12} color="#4A4A47" />}
              />
              <Chip
                label={zoneChipLabel}
                tone={
                  zoneStatus
                    ? zoneStatus.inside
                      ? "ok"
                      : "danger"
                    : "line"
                }
                icon={
                  <IconLocate
                    size={12}
                    color={
                      zoneStatus?.inside
                        ? "#6FA01B"
                        : zoneStatus
                          ? "#E5484D"
                          : "#4A4A47"
                    }
                  />
                }
              />
            </>
          ) : clockState === "break" ? (
            <>
              <Chip
                label="On break"
                tone="warn"
                icon={<IconCoffee size={12} color="#B4610F" />}
              />
              <Chip label={zoneLabel} tone="line" />
            </>
          ) : (
            <>
              <Chip
                label="On shift"
                tone="ok"
                icon={
                  <View className="h-[7px] w-[7px] rounded-full bg-accent" />
                }
              />
              <Chip
                label={
                  trackingActive
                    ? "Tracking · live"
                    : lastLocationLabel
                      ? `GPS ${lastLocationLabel}`
                      : "On shift"
                }
                tone="line"
                icon={<IconRadio size={12} color="#4A4A47" />}
              />
            </>
          )}
        </View>

        {clockState === "on" ? (
          <ClockRing progress={workedProgress || 0.02}>
            <View className="items-center px-2">
              <Text className="text-[12px] text-muted">Worked today</Text>
              <Text className="text-[40px] font-semibold tracking-tight text-text">
                {hhmm}
                <Text className="text-[22px] text-muted">:{ss}</Text>
              </Text>
              <Text className="text-[12px] text-muted">of {shiftHours === "—" ? "8h 30m" : shiftHours}</Text>
            </View>
          </ClockRing>
        ) : clockState === "break" ? (
          <ClockRing progress={0.6}>
            <ClockButton
              mode="break"
              label={syncing ? "Sending…" : t("app.clock.breakEnd")}
              subtitle={zoneLabel}
              onPress={() => void queueBreakEnd()}
            />
          </ClockRing>
        ) : (
          <ClockRing progress={0}>
            <ClockButton
              mode="in"
              label={syncing ? "Sending…" : t("app.clock.in")}
              subtitle={zoneLabel}
              onPress={openClock}
            />
          </ClockRing>
        )}

        {clockState === "off" ? (
          <Text className="mt-1 text-center text-[12px] text-muted">
            {error
              ? error
              : lastLocationLabel
                ? `GPS ${lastLocationLabel}`
                : `Signed in as ${me?.user.email ?? "…"}`}
          </Text>
        ) : null}

        {clockState === "on" ? (
          <View className="mt-2 w-full flex-row gap-2.5">
            <Button
              className="flex-1"
              label={t("app.clock.breakStart")}
              variant="line"
              size="sm"
              disabled={syncing}
              onPress={() => void queueBreakStart()}
            />
            <Button
              className="flex-1"
              label={syncing ? "…" : t("app.clock.out")}
              variant="ink"
              size="sm"
              disabled={syncing}
              onPress={() => void queueClockOut()}
            />
          </View>
        ) : null}

        {clockState === "break" ? (
          <View className="mt-2 w-full rounded-2xl bg-warn-soft px-3.5 py-3">
            <Text className="text-[12.5px] leading-[1.45] text-text-2">
              You can leave the work zone until your break ends. Zone checks
              resume when you end break.
            </Text>
          </View>
        ) : null}

        {clockState === "off" ? (
          <KvStats
            items={[
              { value: fmtHm(todayShift?.startAt), label: "Starts" },
              { value: "30 min", label: "Break" },
              { value: shiftHours, label: "Shift" },
            ]}
          />
        ) : null}

        {clockState === "on" ? (
          <KvStats
            items={[
              { value: fmtHm(clockInAt), label: "Clocked in" },
              { value: fmtHm(todayShift?.endAt), label: "Expected out" },
              { value: "0m", label: "Overtime" },
            ]}
          />
        ) : null}
      </Card>

      <SectionLabel>{t("app.today.quickActions")}</SectionLabel>
      <View className="mb-1 flex-row gap-2">
        {(
          [
            {
              label: t("app.today.requestLeave"),
              href: "/leave/new" as const,
              icon: <IconTreePalm size={20} color="#121212" />,
            },
            {
              label: t("app.today.myTasks"),
              href: "/(tabs)/tasks" as const,
              icon: <IconListChecks size={20} color="#121212" />,
              badge: openTaskCount > 0 ? openTaskCount : undefined,
            },
            {
              label: t("app.today.history"),
              href: "/history" as const,
              icon: <IconHistory size={20} color="#121212" />,
            },
            {
              label: t("app.tabs.map"),
              href: "/(tabs)/map" as const,
              icon: <IconMap size={20} color="#121212" />,
            },
          ] as const
        ).map((item) => (
          <Pressable
            key={item.label}
            className="flex-1 items-center gap-[7px]"
            onPress={() => router.push(item.href)}
            style={{ alignItems: "center" }}
          >
            <View className="relative aspect-square w-full max-w-[66px] items-center justify-center rounded-[18px] border border-line bg-surface">
              {item.icon}
              {"badge" in item && item.badge ? (
                <View className="absolute -end-1 -top-1 min-w-[18px] items-center rounded-full bg-ink px-1">
                  <Text className="text-[10px] font-semibold text-ink-text">
                    {item.badge}
                  </Text>
                </View>
              ) : null}
            </View>
            <Text className="text-center text-[11.5px] font-medium text-text-2">
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <SectionLabel
        action="See all"
        onAction={() => router.push("/(tabs)/tasks")}
      >
        {t("app.today.upNext")}
      </SectionLabel>
      <Card className="mb-1 p-4">
        {upNext.length === 0 ? (
          <Text className="text-[12.5px] text-muted">
            No open tasks yet. Assignments appear here after sync.
          </Text>
        ) : (
          upNext.map((task, i) => (
            <Pressable
              key={task.id}
              className={`flex-row items-center gap-3 ${i > 0 ? "mt-3 border-t border-line pt-3" : ""}`}
              onPress={() => router.push(`/tasks/${task.id}`)}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              <IconTile
                tone={task.raw.priority === "high" ? "warn" : undefined}
              >
                {task.raw.priority === "high" ? (
                  <IconPackage size={18} color="#B4610F" />
                ) : (
                  <IconClipboardCheck size={18} color="#121212" />
                )}
              </IconTile>
              <View className="min-w-0 flex-1">
                <Text
                  className="text-[13.5px] font-semibold text-text"
                  numberOfLines={1}
                >
                  {task.title}
                </Text>
                <Text className="mt-0.5 text-[11.5px] text-muted">
                  {typeof task.raw.dueAt === "string"
                    ? `Due ${new Date(task.raw.dueAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : task.status}
                </Text>
              </View>
              <Chip
                label={
                  typeof task.raw.priority === "string"
                    ? String(task.raw.priority)
                    : task.status ?? "open"
                }
                tone={task.raw.priority === "high" ? "warn" : "info"}
              />
            </Pressable>
          ))
        )}
      </Card>

      <SectionLabel>Today</SectionLabel>
      <Card className="mb-4 p-4">
        <View className="relative ps-[22px]">
          <View className="absolute bottom-1.5 start-1.5 top-1.5 w-[1.5px] bg-line-strong" />
          {(clockState === "off"
            ? [
                {
                  title: `Shift starts · ${fmtHm(todayShift?.startAt)}`,
                  sub: "Reminder before start",
                  tone: "idle" as const,
                },
                {
                  title: "Break window",
                  sub: "Fixed break · 30 min",
                  tone: "idle" as const,
                },
              ]
            : [
                {
                  title: `Clocked in · ${fmtHm(clockInAt)}`,
                  sub: zoneStatus?.inside
                    ? `Inside ${zoneLabel}`
                    : `At ${zoneLabel}`,
                  tone: "ok" as const,
                },
                ...(trackingActive
                  ? [
                      {
                        title: "Location tracking on",
                        sub: "Batched every 60 s or 50 m",
                        tone: "ok" as const,
                      },
                    ]
                  : []),
              ]
          ).map((ev, i, arr) => (
            <View
              key={ev.title}
              className={`relative ${i < arr.length - 1 ? "pb-3.5" : ""}`}
            >
              <View
                className={`absolute -start-[22px] top-[3px] h-[13px] w-[13px] rounded-full border-[3px] border-surface ${
                  ev.tone === "idle"
                    ? "border-faint bg-surface"
                    : "border-accent bg-surface"
                }`}
                style={{
                  borderColor: ev.tone === "idle" ? "#BDBDB8" : "#9ACD32",
                }}
              />
              <Text className="text-[13px] font-semibold text-text">
                {ev.title}
              </Text>
              <Text className="text-[11.5px] text-muted">{ev.sub}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Screen>
  );
}
