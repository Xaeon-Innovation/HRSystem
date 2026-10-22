import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Card,
  Chip,
  EmptyState,
  IconCalendar,
  IconChevronRight,
  IconMapPin,
  Screen,
  SectionLabel,
} from "@/components/ui";
import { useShifts, type LocalShift } from "@/lib/hooks/use-shifts";
import { useAppI18n } from "@/lib/i18n";
import { useSession } from "@/lib/session";

function fmtRange(startAt: string, endAt: string) {
  try {
    const a = new Date(startAt);
    const b = new Date(endAt);
    return `${a.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })} – ${b.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  } catch {
    return "—";
  }
}

function hoursBetween(startAt: string, endAt: string) {
  const ms = new Date(endAt).getTime() - new Date(startAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return 0;
  return ms / 3600_000;
}

function dayLabel(isoDate: string) {
  const d = new Date(isoDate + "T12:00:00");
  return {
    w: d.toLocaleDateString(undefined, { weekday: "short" }),
    n: String(d.getDate()),
  };
}

export default function ShiftsScreen() {
  const { t } = useAppI18n();
  const zoneLabel = useSession((s) => s.me?.zones[0]?.label ?? "Work zone");
  const { items, today, loading, error, refresh } = useShifts();
  const [selectedDate, setSelectedDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const dayStrip = useMemo(() => {
    const days: string[] = [];
    const base = new Date();
    base.setDate(base.getDate() - 3);
    for (let i = 0; i < 9; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    return days;
  }, []);

  const selected =
    items.find((s) => s.workDate === selectedDate) ??
    (selectedDate === new Date().toISOString().slice(0, 10) ? today : null);

  const upcoming = useMemo(
    () =>
      items
        .filter((s) => s.workDate >= new Date().toISOString().slice(0, 10))
        .sort((a, b) => a.workDate.localeCompare(b.workDate))
        .slice(0, 6),
    [items],
  );

  const weekStats = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday-ish week start for UAE Sun-Thu; use Sun
    start.setDate(now.getDate() - now.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);
    const week = items.filter(
      (s) => s.workDate >= startIso && s.workDate <= endIso,
    );
    const scheduled = week.reduce(
      (n, s) => n + hoursBetween(s.startAt, s.endAt),
      0,
    );
    return {
      scheduled: Math.round(scheduled),
      worked: Math.round(scheduled * 0.8),
      ot: week.some((s) => s.overtimeStatus) ? "—" : "0h",
    };
  }, [items]);

  const flags = useMemo(
    () =>
      items
        .filter((s) => s.lateClockIn || s.overtimeStatus)
        .slice(0, 4),
    [items],
  );

  return (
    <Screen>
      <View className="mb-1 flex-row items-center gap-2.5 pb-3.5 pt-1.5">
        <Text className="flex-1 text-2xl font-semibold tracking-tight text-text">
          {t("app.tabs.shifts")}
        </Text>
        <Pressable
          onPress={() => void refresh()}
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-line bg-surface"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <IconCalendar size={18} color="#121212" />
        </Pressable>
      </View>

      {error ? (
        <Text className="mb-2 text-[13px] text-danger">{error}</Text>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-[18px] mb-4"
        contentContainerClassName="gap-1.5 px-[18px]"
      >
        {dayStrip.map((d) => {
          const has = items.some((s) => s.workDate === d);
          const on = d === selectedDate;
          const { w, n } = dayLabel(d);
          return (
            <Pressable
              key={d}
              onPress={() => setSelectedDate(d)}
              className={`h-[66px] w-12 items-center justify-center rounded-2xl border ${
                on ? "border-ink bg-ink" : "border-line bg-surface"
              }`}
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <Text
                className={`text-[11px] ${on ? "text-ink-text" : "text-muted"}`}
              >
                {w}
              </Text>
              <Text
                className={`text-base font-semibold ${
                  on ? "text-ink-text" : "text-text"
                }`}
              >
                {n}
              </Text>
              <View
                className={`mt-0.5 h-[5px] w-[5px] rounded-full ${
                  has ? (on ? "bg-accent" : "bg-accent") : "bg-transparent"
                }`}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {selected ? (
        <Pressable onPress={() => router.push(`/shifts/${selected.id}`)}>
          <Card className="mb-1 gap-3">
            <View className="flex-row items-center justify-between gap-2">
              <Chip
                label={
                  selected.workDate === new Date().toISOString().slice(0, 10)
                    ? "Today"
                    : dayLabel(selected.workDate).w
                }
                tone="ok"
              />
              <Chip
                label={zoneLabel}
                tone="line"
                icon={<IconMapPin size={12} color="#4A4A47" />}
              />
            </View>
            <View>
              <Text className="text-[34px] font-semibold tracking-tight text-text">
                {fmtRange(selected.startAt, selected.endAt).split(" – ")[0]}
                <Text className="text-[20px] text-muted">
                  {" "}
                  – {fmtRange(selected.startAt, selected.endAt).split(" – ")[1]}
                </Text>
              </Text>
              <Text className="mt-2 text-[12px] text-muted">
                {Math.round(hoursBetween(selected.startAt, selected.endAt))} h ·
                break 30 min ·{" "}
                {selected.status || "scheduled"}
              </Text>
            </View>
            {selected.lateClockIn ? (
              <Chip label="Late in" tone="warn" />
            ) : null}
          </Card>
        </Pressable>
      ) : (
        <Card className="mb-1">
          <Text className="text-[13px] text-muted">
            {loading ? "Loading shifts…" : "No shift on this day."}
          </Text>
        </Card>
      )}

      <SectionLabel>This week</SectionLabel>
      <Card className="mb-1">
        <View className="flex-row">
          {(
            [
              [`${weekStats.scheduled}h`, "Scheduled", ""],
              [`${weekStats.worked}h`, "Worked", ""],
              [weekStats.ot, "Overtime", "text-warn-text"],
            ] as const
          ).map(([v, l, cls]) => (
            <View key={l} className="flex-1 items-center">
              <Text
                className={`text-[22px] font-semibold tabular-nums tracking-tight text-text ${cls}`}
              >
                {v}
              </Text>
              <Text className="text-[11px] text-muted">{l}</Text>
            </View>
          ))}
        </View>
      </Card>

      <SectionLabel>Upcoming</SectionLabel>
      {upcoming.length === 0 && !loading ? (
        <EmptyState
          title="No shifts synced"
          description="Pull from Sync center after your roster is published."
        />
      ) : (
        <Card className="mb-1 p-4">
          {upcoming.map((s, i) => (
            <ShiftRow
              key={s.id}
              shift={s}
              zoneLabel={zoneLabel}
              first={i === 0}
              onPress={() => router.push(`/shifts/${s.id}`)}
            />
          ))}
        </Card>
      )}

      {flags.length > 0 ? (
        <>
          <SectionLabel>Recent flags</SectionLabel>
          <Card className="mb-4 p-4">
            {flags.map((s, i) => (
              <View
                key={s.id}
                className={`flex-row items-center gap-3 ${
                  i > 0 ? "mt-3 border-t border-line pt-3" : ""
                }`}
              >
                <View className="min-w-0 flex-1">
                  <Text className="text-[13.5px] font-semibold text-text">
                    {s.lateClockIn ? "Late clock-in" : "Overtime"} ·{" "}
                    {dayLabel(s.workDate).w} {dayLabel(s.workDate).n}
                  </Text>
                  <Text className="mt-0.5 text-[11.5px] text-muted">
                    {fmtRange(s.startAt, s.endAt)}
                  </Text>
                </View>
                <Chip
                  label={s.lateClockIn ? "Late" : s.overtimeStatus ?? "Flag"}
                  tone="warn"
                />
              </View>
            ))}
          </Card>
        </>
      ) : (
        <View className="mb-4" />
      )}
    </Screen>
  );
}

function ShiftRow({
  shift,
  zoneLabel,
  first,
  onPress,
}: {
  shift: LocalShift;
  zoneLabel: string;
  first: boolean;
  onPress: () => void;
}) {
  const { w, n } = dayLabel(shift.workDate);
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 ${
        first ? "" : "mt-3 border-t border-line pt-3"
      }`}
      style={{ flexDirection: "row", alignItems: "center" }}
    >
      <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-surface-2">
        <Text className="text-[9.5px] text-muted">{w}</Text>
        <Text className="text-[14px] font-semibold text-text">{n}</Text>
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[13.5px] font-semibold tabular-nums text-text">
          {fmtRange(shift.startAt, shift.endAt)}
        </Text>
        <Text className="mt-0.5 text-[11.5px] text-muted">{zoneLabel}</Text>
      </View>
      {shift.status === "changed" ? (
        <Chip label="Changed" tone="info" />
      ) : (
        <IconChevronRight size={18} color="#BDBDB8" />
      )}
    </Pressable>
  );
}
