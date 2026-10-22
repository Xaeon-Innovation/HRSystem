"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ListTodo } from "lucide-react";
import { api, getUser } from "@/lib/api";
import { userHasModule } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  Chip,
  EmptyState,
  HatchBar,
  Notice,
  PageHeader,
  Segmented,
  StatBlock,
} from "@/components/elevora";
import { t } from "@/i18n";
import { TaskCreateSheet } from "./task-create-sheet";
import { TaskDetailSheet } from "./task-detail-sheet";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "./task-status-badge";
import { type TaskListItem, type TaskStatus, TASK_STATUS_LABEL } from "./types";

type StatusFilter = TaskStatus | "all";

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TasksDashboard() {
  const user = getUser();
  const isAdmin = userHasModule(user, "tasks");
  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [q, setQ] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [batchFilter, setBatchFilter] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
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

  const stats = useMemo(() => {
    const now = Date.now();
    const completed = tasks.filter((task) => task.status === "completed").length;
    const open = tasks.filter(
      (task) => task.status === "open" || task.status === "in_progress",
    ).length;
    const overdue = tasks.filter(
      (task) =>
        task.dueAt &&
        new Date(task.dueAt).getTime() < now &&
        task.status !== "completed" &&
        task.status !== "cancelled",
    ).length;
    return {
      total: tasks.length,
      open,
      completed,
      overdue,
    };
  }, [tasks]);

  const statusOptions = useMemo(
    () => [
      { value: "all" as const, label: t("All") },
      ...(Object.keys(TASK_STATUS_LABEL) as TaskStatus[]).map((s) => ({
        value: s,
        label: t(TASK_STATUS_LABEL[s]),
      })),
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Tasks")}
        subtitle={
          isAdmin
            ? t("Create and track work for your team.")
            : t("Your assigned tasks.")
        }
        actions={
          isAdmin ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => setCreateOpen(true)}
            >
              {t("Create task")}
            </Button>
          ) : undefined
        }
      />

      {!loading && tasks.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="border-line bg-surface p-4">
            <StatBlock label={t("Total")} value={stats.total} size="sm" />
          </Card>
          <Card className="border-line bg-surface p-4">
            <StatBlock label={t("Open")} value={stats.open} size="sm" />
          </Card>
          <Card className="border-line bg-surface p-4">
            <StatBlock label={t("Overdue")} value={stats.overdue} size="sm" />
          </Card>
          <Card className="border-line bg-surface p-4">
            <StatBlock label={t("Completed")} value={stats.completed} size="sm" />
          </Card>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 rounded-sm border border-line bg-surface p-4">
        <Input
          className="w-full sm:max-w-xs"
          placeholder={t("Search tasks")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="min-w-0 overflow-x-auto">
            <Segmented
              aria-label={t("Status")}
              value={status}
              onChange={setStatus}
              options={statusOptions}
            />
          </div>
          {isAdmin && batchGroups.size > 0 ? (
            <div className="relative inline-flex w-full sm:w-auto">
              <select
                className="h-7 w-full appearance-none rounded-full border border-line-strong bg-surface pe-7 ps-3 text-xs font-medium text-ink sm:w-auto"
                value={batchFilter ?? ""}
                onChange={(e) =>
                  setBatchFilter(e.target.value ? e.target.value : null)
                }
                aria-label={t("Batch")}
              >
                <option value="">{t("All batches")}</option>
                {[...batchGroups.entries()].map(([id, info]) => (
                  <option key={id} value={id}>
                    {info.title} ({info.done}/{info.total})
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute end-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
                aria-hidden
              />
            </div>
          ) : null}
          {batchFilter ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setBatchFilter(null)}
            >
              {t("Clear batch filter")}
            </Button>
          ) : null}
        </div>
      </div>

      {error ? <Notice tone="warn">{error}</Notice> : null}

      {loading ? (
        <PageSkeleton dense />
      ) : !tasks.length ? (
        <Card className="overflow-hidden border-line bg-surface p-0">
          <EmptyState
            icon={<ListTodo className="h-5 w-5" />}
            title={t("No tasks yet.")}
            subtitle={
              isAdmin
                ? t("Create a task to assign work to your team.")
                : t("When someone assigns you work, it will show up here.")
            }
            action={
              isAdmin ? (
                <Button onClick={() => setCreateOpen(true)}>
                  {t("Create task")}
                </Button>
              ) : undefined
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
          {tasks.map((task) => {
            const batch = task.batchId ? batchGroups.get(task.batchId) : null;
            const shared =
              task.assignmentMode === "shared" ||
              (task.assignmentMode !== "individual" &&
                task.assignees.length > 1);
            return (
              <li key={task.id} className="min-w-0">
                <button
                  type="button"
                  className="flex h-full w-full min-w-0 flex-col gap-3 rounded-sm border border-line bg-surface p-4 text-left transition-colors hover:border-line-strong"
                  onClick={() => setDetailId(task.id)}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <TaskPriorityBadge priority={task.priority} />
                    <TaskStatusBadge status={task.status} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {task.title}
                    </p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {task.dueAt
                        ? `${t("Due")} ${task.dueAt.slice(0, 10)}`
                        : t("No due date")}
                      {task.tags[0] ? ` · ${task.tags[0]}` : ""}
                    </p>
                  </div>

                  {task.assignmentMode === "individual" && batch ? (
                    <div className="space-y-1">
                      <p className="text-2xs text-ink-muted">
                        {batch.done}/{batch.total} {t("complete")}
                      </p>
                      <HatchBar
                        percent={
                          batch.total
                            ? (batch.done / batch.total) * 100
                            : 0
                        }
                        size="xs"
                        tone={
                          batch.done === batch.total ? "accent" : "soft"
                        }
                      />
                    </div>
                  ) : null}

                  {shared ? (
                    <p className="text-2xs text-ink-muted">
                      {t("Shared · one activity log")}
                    </p>
                  ) : null}

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <div className="flex -space-x-2">
                      {task.assignees.slice(0, 4).map((a) => (
                        <span
                          key={a.employeeId}
                          title={a.name}
                          className="inline-grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-surface-2 text-[10px] font-semibold text-ink"
                        >
                          {initials(a.name)}
                        </span>
                      ))}
                      {task.assignees.length > 4 ? (
                        <span className="inline-grid h-7 w-7 place-items-center rounded-full border-2 border-surface bg-surface-3 text-[10px] font-semibold text-ink-muted">
                          +{task.assignees.length - 4}
                        </span>
                      ) : null}
                      {!task.assignees.length ? (
                        <span className="text-2xs text-ink-muted">
                          {t("Unassigned")}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {task.tags.slice(0, 3).map((tag) => (
                        <Chip key={tag} tone="neutral">
                          {tag}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
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
