"use client";

import { useEffect, useState } from "react";
import { api, getUser } from "@/lib/api";
import { userHasModule } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { t } from "@/i18n";
import {
  TaskPriorityBadge,
  TaskStatusBadge,
} from "@/components/tasks/task-status-badge";
import {
  DELIVERABLE_TYPE_LABEL,
  type TaskDetail,
} from "./types";

const MAX_FILE = Math.floor(1.5 * 1024 * 1024);

export function TaskDetailSheet({
  taskId,
  open,
  onOpenChange,
  onChanged,
}: {
  taskId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}) {
  const user = getUser();
  const isAdmin = userHasModule(user, "tasks");
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelBatch, setCancelBatch] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [deliverableReqId, setDeliverableReqId] = useState<string>("");

  async function load() {
    if (!taskId) return;
    setError(null);
    try {
      const res = await api<{ task: TaskDetail }>(`/v1/tasks/${taskId}`, {
        skipCache: true,
      });
      setTask(res.task);
      if (res.task.deliverableRequirements[0]) {
        setDeliverableReqId(res.task.deliverableRequirements[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Could not load task"));
    }
  }

  useEffect(() => {
    if (open && taskId) void load();
    if (!open) {
      setTask(null);
      setError(null);
      setReviewNote("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, taskId]);

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("Action failed"));
    } finally {
      setBusy(false);
    }
  }

  async function post(path: string, body?: unknown) {
    const res = await api<{ task: TaskDetail }>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      skipCache: true,
    });
    setTask(res.task);
  }

  async function onFileForDeliverable(file: File | null) {
    if (!file || !task || !deliverableReqId) return;
    if (file.size > MAX_FILE) {
      setError(t("Each file must be 1.5 MB or smaller."));
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(file);
    });
    await run(() =>
      post(`/v1/tasks/${task.id}/deliverables`, {
        requirementId: deliverableReqId,
        attachment: {
          kind: "file",
          name: file.name,
          mime: file.type || "application/octet-stream",
          size: file.size,
          dataUrl,
        },
      }),
    );
  }

  async function addDeliverableLink() {
    if (!task || !deliverableReqId || !linkName.trim() || !linkUrl.trim()) return;
    await run(async () => {
      await post(`/v1/tasks/${task.id}/deliverables`, {
        requirementId: deliverableReqId,
        attachment: {
          kind: "link",
          name: linkName.trim(),
          url: linkUrl.trim(),
        },
      });
      setLinkName("");
      setLinkUrl("");
    });
  }

  const covered = new Set(
    task?.deliverableSubmissions.map((s) => s.requirementId) ?? [],
  );
  const missingReqs =
    task?.deliverableRequirements.filter((r) => !covered.has(r.id)) ?? [];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="max-w-xl">
          <SheetHeader>
            <SheetTitle>{task?.title ?? t("Task")}</SheetTitle>
            <SheetDescription>
              {task ? t("Task details") : t("Loading…")}
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            {!task ? (
              <p className="text-sm text-muted-foreground">{t("Loading…")}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 text-xs">
                  <TaskStatusBadge status={task.status} />
                  <TaskPriorityBadge priority={task.priority} />
                  {task.dueAt ? (
                    <span className="rounded-full border border-input px-2.5 py-1">
                      {t("Due")} {task.dueAt.slice(0, 10)}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-input px-2.5 py-1">
                    {task.assignmentMode === "shared"
                      ? t("Shared")
                      : t("Individual")}
                  </span>
                  {task.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-secondary px-2.5 py-1"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {task.description ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {task.description}
                  </p>
                ) : null}

                {task.reviewNote ? (
                  <p className="rounded-md border border-input bg-secondary/40 px-3 py-2 text-sm">
                    <span className="font-medium">{t("Review note")}: </span>
                    {task.reviewNote}
                  </p>
                ) : null}

                <div>
                  <h3 className="mb-1 text-sm font-medium">{t("Assignees")}</h3>
                  <p className="text-sm text-muted-foreground">
                    {task.assignees.map((a) => a.name).join(", ") || t("None")}
                  </p>
                </div>

                {task.attachments.length ? (
                  <div>
                    <h3 className="mb-1 text-sm font-medium">
                      {t("Attachments")}
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {task.attachments.map((a) => (
                        <li key={a.id}>
                          {a.kind === "link" && a.url ? (
                            <a
                              className="text-primary underline"
                              href={a.url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {a.name}
                            </a>
                          ) : a.dataUrl ? (
                            <a
                              className="text-primary underline"
                              href={a.dataUrl}
                              download={a.name}
                            >
                              {a.name}
                            </a>
                          ) : (
                            a.name
                          )}
                          {a.uploadedByName ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {a.uploadedByName}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {task.deliverableRequirements.length ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">
                      {t("Deliverables")}
                    </h3>
                    <ul className="space-y-1 text-sm">
                      {task.deliverableRequirements.map((r) => (
                        <li key={r.id} className="flex items-center gap-2">
                          <span
                            className={
                              covered.has(r.id)
                                ? "text-foreground"
                                : "text-muted-foreground"
                            }
                          >
                            {covered.has(r.id) ? "[done]" : "[needed]"}{" "}
                            {t(DELIVERABLE_TYPE_LABEL[r.type])}
                            {r.label ? ` (${r.label})` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {task.deliverableSubmissions.length ? (
                      <ul className="space-y-1 border-t border-input pt-2 text-sm">
                        {task.deliverableSubmissions.map((s) => (
                          <li key={s.id}>
                            {s.employeeName ?? t("Assignee")}:{" "}
                            {s.kind === "link" && s.url ? (
                              <a
                                className="text-primary underline"
                                href={s.url}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {s.name}
                              </a>
                            ) : s.dataUrl ? (
                              <a
                                className="text-primary underline"
                                href={s.dataUrl}
                                download={s.name}
                              >
                                {s.name}
                              </a>
                            ) : (
                              s.name
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {task.status !== "completed" &&
                    task.status !== "cancelled" ? (
                      <div className="space-y-2 rounded-md border border-input p-3">
                        <Label>{t("Submit evidence")}</Label>
                        <select
                          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                          value={deliverableReqId}
                          onChange={(e) => setDeliverableReqId(e.target.value)}
                        >
                          {task.deliverableRequirements.map((r) => (
                            <option key={r.id} value={r.id}>
                              {DELIVERABLE_TYPE_LABEL[r.type]}
                              {r.label ? ` (${r.label})` : ""}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="file"
                          onChange={(e) =>
                            void onFileForDeliverable(
                              e.target.files?.[0] ?? null,
                            )
                          }
                        />
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder={t("Link name")}
                            value={linkName}
                            onChange={(e) => setLinkName(e.target.value)}
                          />
                          <Input
                            placeholder="https://…"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => void addDeliverableLink()}
                          >
                            {t("Add link")}
                          </Button>
                        </div>
                        {missingReqs.length ? (
                          <p className="text-xs text-muted-foreground">
                            {t("Still needed")}:{" "}
                            {missingReqs
                              .map((r) => DELIVERABLE_TYPE_LABEL[r.type])
                              .join(", ")}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            {t("All required deliverables uploaded.")}
                          </p>
                        )}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div>
                  <h3 className="mb-2 text-sm font-medium">{t("Activity")}</h3>
                  <ul className="space-y-2">
                    {task.activity.map((a) => (
                      <li key={a.id} className="text-sm">
                        <span className="font-medium">
                          {a.actorName ?? t("Someone")}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {a.message}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {new Date(a.createdAt).toLocaleString()}
                        </div>
                      </li>
                    ))}
                    {!task.activity.length ? (
                      <li className="text-sm text-muted-foreground">
                        {t("No activity yet")}
                      </li>
                    ) : null}
                  </ul>
                </div>
              </>
            )}
          </SheetBody>
          {task ? (
            <SheetFooter className="flex-wrap justify-start gap-2">
              {task.status === "open" || task.status === "changes_requested" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={() =>
                    void run(() => post(`/v1/tasks/${task.id}/start`))
                  }
                >
                  {t("Start")}
                </Button>
              ) : null}
              {!task.requiresReview &&
              task.status !== "completed" &&
              task.status !== "cancelled" &&
              task.status !== "submitted" ? (
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={() =>
                    void run(() => post(`/v1/tasks/${task.id}/complete`))
                  }
                >
                  {t("Mark complete")}
                </Button>
              ) : null}
              {task.requiresReview &&
              task.status !== "completed" &&
              task.status !== "cancelled" &&
              task.status !== "submitted" ? (
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={() =>
                    void run(() => post(`/v1/tasks/${task.id}/submit`))
                  }
                >
                  {t("Submit for review")}
                </Button>
              ) : null}
              {isAdmin && task.status === "submitted" ? (
                <div className="flex w-full flex-col gap-2">
                  <Input
                    placeholder={t("Review note (optional)")}
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          post(`/v1/tasks/${task.id}/review`, {
                            decision: "approve",
                            note: reviewNote,
                          }),
                        )
                      }
                    >
                      {t("Approve")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          post(`/v1/tasks/${task.id}/review`, {
                            decision: "send_back",
                            note: reviewNote,
                          }),
                        )
                      }
                    >
                      {t("Send back")}
                    </Button>
                  </div>
                </div>
              ) : null}
              {isAdmin &&
              task.status !== "completed" &&
              task.status !== "cancelled" ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={() => {
                    setCancelBatch(false);
                    setCancelOpen(true);
                  }}
                >
                  {t("Cancel task")}
                </Button>
              ) : null}
              {isAdmin &&
              task.batchId &&
              task.status !== "cancelled" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={busy}
                  onClick={() => {
                    setCancelBatch(true);
                    setCancelOpen(true);
                  }}
                >
                  {t("Cancel entire batch")}
                </Button>
              ) : null}
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={cancelOpen}
        title={
          cancelBatch
            ? t("Cancel all tasks in this batch?")
            : t("Cancel this task?")
        }
        description={t("This cannot be undone.")}
        confirmLabel={t("Cancel task")}
        variant="destructive"
        busy={busy}
        onConfirm={() =>
          void run(async () => {
            if (!task) return;
            await api(
              `/v1/tasks/${task.id}/cancel${cancelBatch ? "?batch=true" : ""}`,
              { method: "POST", skipCache: true },
            );
            setCancelOpen(false);
            onOpenChange(false);
          })
        }
        onOpenChange={(next) => {
          if (!busy) setCancelOpen(next);
        }}
      />
    </>
  );
}
