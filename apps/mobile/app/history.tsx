import { router } from "expo-router";
import { goBack } from "@/lib/nav";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  Card,
  Chip,
  EmptyState,
  IconChevronLeft,
  Screen,
} from "@/components/ui";
import { useHistory } from "@/lib/hooks/use-history";

function dayLabel(d: Date) {
  return {
    w: d.toLocaleDateString(undefined, { weekday: "short" }),
    n: String(d.getDate()),
    iso: d.toISOString().slice(0, 10),
  };
}

function fmtTime(iso: string | null | undefined) {
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

function durationLabel(inAt: string | null, outAt: string | null) {
  if (!inAt) return "—";
  const end = outAt ? new Date(outAt).getTime() : Date.now();
  const ms = end - new Date(inAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, "0")}`;
}

export default function HistoryScreen() {
  const { items, loading, error, refresh } = useHistory();
  const [selected, setSelected] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );

  const dayStrip = useMemo(() => {
    const days: Date[] = [];
    const base = new Date();
    for (let i = -3; i <= 3; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      days.push(d);
    }
    return days.map(dayLabel);
  }, []);

  const dayItems = useMemo(
    () =>
      items.filter((row) => {
        if (!row.clockInAt) return false;
        return row.clockInAt.slice(0, 10) === selected;
      }),
    [items, selected],
  );

  const totals = useMemo(() => {
    let workedMs = 0;
    for (const row of dayItems) {
      if (!row.clockInAt) continue;
      const end = row.clockOutAt
        ? new Date(row.clockOutAt).getTime()
        : Date.now();
      workedMs += Math.max(0, end - new Date(row.clockInAt).getTime());
    }
    const h = Math.floor(workedMs / 3600_000);
    const m = Math.floor((workedMs % 3600_000) / 60_000);
    return {
      worked: `${h}h ${String(m).padStart(2, "0")}`,
      ot: "0h 00",
      brk: "—",
    };
  }, [dayItems]);

  const heading = useMemo(() => {
    const d = new Date(selected + "T12:00:00");
    return d.toLocaleDateString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }, [selected]);

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
          History
        </Text>
        <Pressable onPress={() => void refresh()} className="w-[42px]">
          <Text className="text-center text-[11px] font-semibold text-muted">
            {loading ? "…" : "↻"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-[18px] mb-4"
        contentContainerClassName="gap-1.5 px-[18px]"
      >
        {dayStrip.map((d) => {
          const on = d.iso === selected;
          return (
            <Pressable
              key={d.iso}
              onPress={() => setSelected(d.iso)}
              className={`h-[66px] w-12 items-center justify-center rounded-2xl border ${
                on ? "border-ink bg-ink" : "border-line bg-surface"
              }`}
              style={{ alignItems: "center", justifyContent: "center" }}
            >
              <Text
                className={`text-[11px] ${on ? "text-ink-text" : "text-muted"}`}
              >
                {d.w}
              </Text>
              <Text
                className={`text-base font-semibold ${
                  on ? "text-ink-text" : "text-text"
                }`}
              >
                {d.n}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mb-3 flex-row gap-2">
        {(
          [
            [totals.worked, "Worked"],
            [totals.ot, "Overtime"],
            [totals.brk, "Break"],
          ] as const
        ).map(([v, l]) => (
          <Card key={l} className="flex-1 items-center p-3">
            <Text className="text-[22px] font-semibold tabular-nums tracking-tight text-text">
              {v}
            </Text>
            <Text className="text-[11px] text-muted">{l}</Text>
          </Card>
        ))}
      </View>

      {error ? (
        <Text className="mb-2 text-[13px] text-danger">{error}</Text>
      ) : null}

      <Card className="mb-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-[14.5px] font-semibold text-text">{heading}</Text>
          <Chip
            label={dayItems.some((r) => r.flags.includes("late_in")) ? "Late in" : "On time"}
            tone={dayItems.some((r) => r.flags.includes("late_in")) ? "warn" : "ok"}
          />
        </View>

        {dayItems.length === 0 && !loading ? (
          <EmptyState
            title="No sessions"
            description="Clock in on Today — sessions appear here after sync."
          />
        ) : (
          dayItems.map((row, i) => (
            <View
              key={row.id}
              className={`flex-row items-center gap-3 ${
                i > 0 ? "mt-3 border-t border-line pt-3" : ""
              }`}
            >
              <View className="min-w-0 flex-1">
                <Text className="text-[13.5px] font-semibold tabular-nums text-text">
                  {fmtTime(row.clockInAt)} – {fmtTime(row.clockOutAt)}
                </Text>
                <Text className="mt-0.5 text-[11.5px] text-muted">
                  {row.source ?? "Session"}
                  {row.flags.length ? ` · ${row.flags.join(", ")}` : ""}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[13px] font-semibold tabular-nums text-text">
                  {durationLabel(row.clockInAt, row.clockOutAt)}
                </Text>
                {row.source === "offline" || row.flags.includes("offline") ? (
                  <Chip label="Offline" tone="line" />
                ) : null}
              </View>
            </View>
          ))
        )}
      </Card>
    </Screen>
  );
}
