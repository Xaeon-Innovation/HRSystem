import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import {
  Chip,
  EmptyState,
  Hatch,
  IconSearch,
  Screen,
  Segmented,
} from "@/components/ui";
import { isActiveTask, useTasks } from "@/lib/hooks/use-tasks";
import { useAppI18n } from "@/lib/i18n";

const FILTERS = [
  { id: "open", label: "Open" },
  { id: "in_progress", label: "In progress" },
  { id: "submitted", label: "Submitted" },
  { id: "completed", label: "Done" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function priorityTone(p: unknown) {
  if (p === "urgent" || p === "critical") return "danger" as const;
  if (p === "high") return "warn" as const;
  return "neutral" as const;
}

function statusTone(s: string | null | undefined) {
  if (s === "completed") return "ok" as const;
  if (s === "changes_requested") return "warn" as const;
  if (s === "submitted") return "info" as const;
  return "info" as const;
}

export default function TasksScreen() {
  const { t } = useAppI18n();
  const { items, loading, error, refresh } = useTasks();
  const [filter, setFilter] = useState<FilterId>("open");

  const openCount = items.filter((x) => isActiveTask(x.status)).length;

  const filtered = useMemo(() => {
    if (filter === "open") {
      return items.filter((t) => isActiveTask(t.status));
    }
    if (filter === "completed") {
      return items.filter(
        (t) => t.status === "completed" || t.status === "cancelled",
      );
    }
    return items.filter((t) => t.status === filter);
  }, [items, filter]);

  const segOptions = FILTERS.map((f) => ({
    id: f.id,
    label:
      f.id === "open" && openCount > 0 ? `Open · ${openCount}` : f.label,
  }));

  return (
    <Screen>
      <View className="mb-1 flex-row items-center gap-2.5 pb-3.5 pt-1.5">
        <Text className="flex-1 text-2xl font-semibold tracking-tight text-text">
          {t("app.tabs.tasks")}
        </Text>
        <Pressable
          onPress={() => void refresh()}
          className="h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-line bg-surface"
          style={{ alignItems: "center", justifyContent: "center" }}
        >
          <IconSearch size={18} color="#121212" />
        </Pressable>
      </View>

      <Segmented
        options={segOptions}
        value={filter}
        onChange={setFilter}
        className="mb-3"
      />

      {error ? (
        <Text className="mb-3 text-[13px] text-danger">{error}</Text>
      ) : null}

      {filtered.length === 0 && !loading ? (
        <EmptyState
          title="No tasks in this filter"
          description="Pull from Sync center or wait for assignments from your admin."
        />
      ) : (
        <View className="mb-4 gap-2.5">
          {filtered.map((task) => {
            const priority =
              typeof task.raw.priority === "string"
                ? task.raw.priority
                : null;
            const due =
              typeof task.raw.dueAt === "string"
                ? new Date(task.raw.dueAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;
            const overdue =
              typeof task.raw.dueAt === "string" &&
              new Date(task.raw.dueAt).getTime() < Date.now() &&
              task.status !== "completed";
            return (
              <Pressable
                key={task.id}
                onPress={() => router.push(`/tasks/${task.id}`)}
                className="rounded-[20px] border border-line bg-surface p-3.5"
              >
                <View className="flex-row items-center justify-between gap-2">
                  <View className="min-w-0 flex-1 flex-row flex-wrap gap-1.5">
                    {priority ? (
                      <Chip
                        label={priority}
                        tone={priorityTone(priority)}
                      />
                    ) : null}
                    <Chip
                      label={task.status?.replace(/_/g, " ") ?? "open"}
                      tone={statusTone(task.status)}
                    />
                  </View>
                  <Text className="text-[11.5px] tabular-nums text-muted">
                    {overdue ? "Overdue" : due ? `Due ${due}` : ""}
                  </Text>
                </View>
                <Text className="mt-2 text-[14.5px] font-semibold leading-snug text-text">
                  {task.title || task.id.slice(0, 8)}
                </Text>
                <Text className="mt-1 text-xs text-muted" numberOfLines={2}>
                  {typeof task.raw.description === "string"
                    ? task.raw.description
                    : `v${task.version}`}
                </Text>
                {typeof task.raw.progress === "number" ? (
                  <View className="mt-3 h-[7px] overflow-hidden rounded-full bg-bar-idle">
                    <Hatch
                      tone="accent"
                      className="h-full"
                      style={{
                        width: `${Math.min(100, Math.max(0, task.raw.progress))}%`,
                      }}
                    />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
