"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, getUser } from "@/lib/api";
import { userHasModule } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/i18n";
import { TaskCreateSheet } from "./task-create-sheet";
import { TaskDetailSheet } from "./task-detail-sheet";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "./task-status-badge";
import { type TaskListItem, type TaskStatus, TASK_STATUS_LABEL } from "./types";

export function TasksDashboard() {
  const user = getUser();
  const isAdmin = userHasModule(user, "tasks");
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [batchFilter, setBatchFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      if (batchFilter) params.set("batchId", batchFilter);
      const qs = params.toString();
      const res = await api<{ tasks: TaskListItem[] }>(
        `/v1/tasks${qs ? `?${qs}` : ""}`,
        { skipCache: true },
      );
      setTasks(res.tasks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not load tasks"));
    } finally {
      setLoading(false);
    }
  }, [status, q, batchFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const batchGroups = useMemo(() => {
    const map = new Map<string, { title: string; total: number; done: number }>();
    for (const task of tasks) {
      if (!task.batchId) continue;
      const cur = map.get(task.batchId) ?? {
        title: task.title,
        total: 0,
        done: 0,
      };
      cur.total += 1;
      if (task.status === "completed") cur.done += 1;
      map.set(task.batchId, cur);
    }
    return map;
  }, [tasks]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{t("Tasks")}</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? t("Create and track work for your team.")
              : t("Your assigned tasks.")}
          </p>
        </div>
        {isAdmin ? (
          <Button
            className="w-full sm:w-auto"
            onClick={() => setCreateOpen(true)}
          >
            {t("Create task")}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Search tasks")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm sm:w-auto"
          value={status}
          onChange={(e) => setStatus(e.target.value as TaskStatus | "")}
        >
          <option value="">{t("All statuses")}</option>
          {(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((s) => (
            <option key={s} value={s}>
              {TASK_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {batchFilter ? (
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setBatchFilter(null)}
          >
            {t("Clear batch filter")}
          </Button>
        ) : null}
      </div>

      {isAdmin && batchGroups.size > 0 && !batchFilter ? (
        <div className="space-y-2">
          <h2 className="text-sm font-medium">{t("Batches")}</h2>
          <div className="flex flex-col gap-2">
            {[...batchGroups.entries()].map(([id, info]) => (
              <button
                key={id}
                type="button"
                className="flex w-full flex-col gap-1 rounded-lg border border-input px-3 py-2 text-left text-sm hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between"
                onClick={() => setBatchFilter(id)}
              >
                <span className="min-w-0 truncate font-medium">{info.title}</span>
                <span className="text-muted-foreground">
                  {info.done}/{info.total} {t("complete")}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("Loading…")}</p>
      ) : !tasks.length ? (
        <p className="text-sm text-muted-foreground">{t("No tasks yet.")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-input">
          {tasks.map((task) => (
            <li key={task.id}>
              <button
                type="button"
                className="flex w-full flex-col gap-1 px-3 py-3 text-left hover:bg-secondary/40 sm:flex-row sm:items-center sm:justify-between"
                onClick={() => setDetailId(task.id)}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{task.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {task.assignees.map((a) => a.name).join(", ") ||
                      t("Unassigned")}
                    {task.assignmentMode === "individual"
                      ? ` · ${t("Individual")}`
                      : task.assignees.length > 1
                        ? ` · ${t("Shared")}`
                        : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <TaskStatusBadge status={task.status} />
                  <TaskPriorityBadge priority={task.priority} />
                  {task.dueAt ? (
                    <span className="text-xs text-muted-foreground">
                      {t("Due")} {task.dueAt.slice(0, 10)}
                    </span>
                  ) : null}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <TaskCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => void load()}
      />
      <TaskDetailSheet
        taskId={detailId}
        open={Boolean(detailId)}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
        onChanged={() => void load()}
      />
    </div>
  );
}
