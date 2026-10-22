import { router, useLocalSearchParams } from "expo-router";
import { goBack } from "@/lib/nav";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { Button, Card, Chip, Screen, TextField } from "@/components/ui";
import { useTaskActions } from "@/lib/hooks/use-task-actions";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useSession } from "@/lib/session";

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useSession((s) => s.me);
  const { items, refresh } = useTasks();
  const task = items.find((t) => t.id === id);
  const { busy, error, setStatus, review, addComment } = useTaskActions(refresh);
  const [comment, setComment] = useState("");

  const canReview =
    me?.role === "tenant_admin" || me?.moduleRoles.includes("tasks");

  const status = task?.status ?? "open";

  const actions = useMemo(() => {
    if (status === "open") {
      return [
        {
          label: "Start",
          onPress: () => void setStatus(task!.id, "in_progress"),
        },
      ];
    }
    if (status === "in_progress") {
      return [
        {
          label: "Submit for review",
          onPress: () => void setStatus(task!.id, "submitted"),
        },
        {
          label: "Mark complete",
          onPress: () => void setStatus(task!.id, "completed"),
        },
      ];
    }
    if (status === "changes_requested") {
      return [
        {
          label: "Resubmit",
          onPress: () => void setStatus(task!.id, "submitted"),
        },
      ];
    }
    return [];
  }, [status, setStatus, task]);

  if (!task) {
    return (
      <Screen>
        <Text className="text-xl font-semibold text-text">Task not found</Text>
        <Button className="mt-4" label="Back" variant="soft" onPress={() => goBack()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="text-2xl font-semibold text-text">
        {task.title || "Task"}
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        <Chip label={status} tone="info" />
        {typeof task.raw.priority === "string" ? (
          <Chip label={String(task.raw.priority)} tone="line" />
        ) : null}
      </View>

      <Card className="mt-4 gap-2">
        <Text className="text-[13px] text-text-2">
          {typeof task.raw.description === "string"
            ? task.raw.description
            : "No description in sync payload."}
        </Text>
        {typeof task.raw.dueAt === "string" ? (
          <Text className="text-[12px] text-muted">
            Due {new Date(task.raw.dueAt).toLocaleString()}
          </Text>
        ) : null}
        {error ? <Text className="text-[13px] text-danger">{error}</Text> : null}
      </Card>

      <View className="mt-4 gap-2">
        {actions.map((a) => (
          <Button
            key={a.label}
            label={busy ? "…" : a.label}
            variant="accent"
            disabled={busy}
            onPress={a.onPress}
          />
        ))}
      </View>

      {canReview && status === "submitted" ? (
        <Card className="mt-4 gap-2">
          <Text className="text-[13px] font-semibold text-text">Review</Text>
          <Button
            label="Accept"
            variant="accent"
            size="sm"
            disabled={busy}
            onPress={() => void review(task.id, "accept")}
          />
          <Button
            label="Request changes"
            variant="line"
            size="sm"
            disabled={busy}
            onPress={() =>
              void review(task.id, "request_changes", "Please revise deliverables")
            }
          />
        </Card>
      ) : null}

      <Card className="mt-4 gap-2">
        <Text className="text-[13px] font-semibold text-text">Comment</Text>
        <TextField value={comment} onChangeText={setComment} placeholder="Note" />
        <Button
          label="Add comment"
          variant="line"
          size="sm"
          disabled={busy || !comment.trim()}
          onPress={() =>
            void addComment(task.id, comment.trim()).then((ok) => {
              if (ok) setComment("");
            })
          }
        />
      </Card>

      <Button className="mt-6" label="Back" variant="soft" onPress={() => goBack()} />
    </Screen>
  );
}
