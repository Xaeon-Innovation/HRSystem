"use client";

import { useEffect, useMemo, useState } from "react";
import {
  TASK_ASSIGNMENT_MODES,
  TASK_DELIVERABLE_TYPES,
  TASK_PRIORITIES,
  type TaskAssignmentMode,
  type TaskDeliverableType,
  type TaskPriority,
} from "@hr/shared";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { t } from "@/i18n";
import { DELIVERABLE_TYPE_LABEL } from "./types";

type EmployeeOpt = { id: string; name: string };
type JobRoleOpt = { id: string; name: string };
type BranchOpt = { id: string; name: string };

type AttachmentDraft =
  | { kind: "link"; name: string; url: string }
  | {
      kind: "file";
      name: string;
      mime: string;
      size: number;
      dataUrl: string;
    };

const MAX_FILE = Math.floor(1.5 * 1024 * 1024);

export function TaskCreateSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueAt, setDueAt] = useState("");
  const [requiresReview, setRequiresReview] = useState(false);
  const [assignmentMode, setAssignmentMode] =
    useState<TaskAssignmentMode>("shared");
  const [tagsText, setTagsText] = useState("");
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [jobRoleIds, setJobRoleIds] = useState<string[]>([]);
  const [branchIds, setBranchIds] = useState<string[]>([]);
  const [deliverables, setDeliverables] = useState<TaskDeliverableType[]>([]);
  const [attachments, setAttachments] = useState<AttachmentDraft[]>([]);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [employees, setEmployees] = useState<EmployeeOpt[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRoleOpt[]>([]);
  const [branches, setBranches] = useState<BranchOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assigneeError, setAssigneeError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      api<{ employees: Array<{ id: string; name: string }> }>("/v1/employees"),
      api<{ jobRoles: Array<{ id: string; name: string }> }>("/v1/job-roles"),
      api<{ branches: Array<{ id: string; name: string }> }>("/v1/branches"),
    ])
      .then(([emps, roles, br]) => {
        setEmployees(
          (emps.employees ?? []).map((e) => ({ id: e.id, name: e.name })),
        );
        setJobRoles(roles.jobRoles ?? []);
        setBranches(br.branches ?? []);
      })
      .catch(() => undefined);
  }, [open]);

  function reset() {
    setTitle("");
    setDescription("");
    setPriority("medium");
    setDueAt("");
    setRequiresReview(false);
    setAssignmentMode("shared");
    setTagsText("");
    setEmployeeIds([]);
    setJobRoleIds([]);
    setBranchIds([]);
    setDeliverables([]);
    setAttachments([]);
    setLinkName("");
    setLinkUrl("");
    setError(null);
    setAssigneeError(null);
    setTitleError(null);
  }

  function formatApiError(raw: string): string {
    try {
      const parsed = JSON.parse(raw) as {
        formErrors?: string[];
        fieldErrors?: Record<string, string[]>;
      };
      if (parsed && (parsed.formErrors || parsed.fieldErrors)) {
        const messages = [
          ...(parsed.formErrors ?? []),
          ...Object.values(parsed.fieldErrors ?? {}).flat(),
        ].filter(Boolean);
        if (messages.length) return messages.join(" ");
      }
    } catch {
      // not JSON
    }
    return raw;
  }

  function toggleId(
    list: string[],
    setList: (v: string[]) => void,
    id: string,
  ) {
    setAssigneeError(null);
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  async function onFile(file: File | null) {
    if (!file) return;
    if (attachments.length >= 3) {
      setError(t("You can attach up to 3 files."));
      return;
    }
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
    setAttachments((prev) => [
      ...prev,
      {
        kind: "file",
        name: file.name,
        mime: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
      },
    ]);
  }

  function addLink() {
    if (!linkName.trim() || !linkUrl.trim()) return;
    if (attachments.length >= 3) {
      setError(t("You can attach up to 3 items."));
      return;
    }
    try {
      // validate
      new URL(linkUrl.trim());
    } catch {
      setError(t("Enter a valid URL."));
      return;
    }
    setAttachments((prev) => [
      ...prev,
      { kind: "link", name: linkName.trim(), url: linkUrl.trim() },
    ]);
    setLinkName("");
    setLinkUrl("");
  }

  const tags = useMemo(
    () =>
      tagsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 20),
    [tagsText],
  );

  async function submit() {
    setBusy(true);
    setError(null);
    setAssigneeError(null);
    setTitleError(null);

    const trimmed = title.trim();
    if (!trimmed) {
      setTitleError(t("Enter a task name."));
      setBusy(false);
      requestAnimationFrame(() => {
        document.getElementById("task-title")?.focus();
        document.getElementById("task-title")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }
    if (!employeeIds.length && !jobRoleIds.length && !branchIds.length) {
      setAssigneeError(
        t("Select at least one employee, job role, or branch."),
      );
      setBusy(false);
      requestAnimationFrame(() => {
        document.getElementById("task-assignees")?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      });
      return;
    }

    try {
      await api("/v1/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: trimmed,
          description: description.trim(),
          priority,
          dueAt: dueAt ? new Date(dueAt).toISOString() : null,
          requiresReview,
          assignmentMode,
          tags,
          employeeIds,
          jobRoleIds,
          branchIds,
          attachments,
          deliverableRequirements: deliverables.map((type) => ({ type })),
        }),
      });
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : t("Could not create task");
      const message = formatApiError(raw);
      if (/employee|job role|branch/i.test(message)) {
        setAssigneeError(message);
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          onOpenChange(next);
          if (!next) reset();
        }
      }}
    >
      <SheetContent className="max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("Create task")}</SheetTitle>
          <SheetDescription>
            {t("Assign work to people, job roles, or branches.")}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label
              htmlFor="task-title"
              className={titleError ? "text-destructive" : undefined}
            >
              {t("Name")}
            </Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (titleError) setTitleError(null);
              }}
              placeholder={t("Task name")}
              aria-invalid={Boolean(titleError)}
              className={
                titleError
                  ? "border-destructive bg-destructive/10 ring-2 ring-destructive/40 focus-visible:ring-destructive"
                  : undefined
              }
            />
            {titleError ? (
              <p className="text-xs font-medium text-destructive">{titleError}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">{t("Description")}</Label>
            <textarea
              id="task-desc"
              className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="task-priority">{t("Priority")}</Label>
              <select
                id="task-priority"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="task-due">{t("Due date")}</Label>
              <Input
                id="task-due"
                type="datetime-local"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("Assignment mode")}</Label>
            <div className="flex flex-col gap-2">
              {TASK_ASSIGNMENT_MODES.map((mode) => (
                <label
                  key={mode}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-input px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    className="mt-1"
                    checked={assignmentMode === mode}
                    onChange={() => setAssignmentMode(mode)}
                  />
                  <span>
                    <span className="font-medium">
                      {mode === "shared"
                        ? t("Shared team task")
                        : t("Separate task per person")}
                    </span>
                    <span className="mt-0.5 block text-muted-foreground">
                      {mode === "shared"
                        ? t("Everyone collaborates on one task and sees activity.")
                        : t("Each assignee gets their own copy to complete.")}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2">
            <div>
              <p className="text-sm font-medium">{t("Requires admin review")}</p>
              <p className="text-xs text-muted-foreground">
                {t("Assignees submit deliverables; you approve or send back.")}
              </p>
            </div>
            <Switch checked={requiresReview} onCheckedChange={setRequiresReview} />
          </div>

          <div
            id="task-assignees"
            className={`space-y-3 rounded-lg p-3 ${
              assigneeError
                ? "border-2 border-destructive bg-destructive/10 ring-2 ring-destructive/30"
                : "border border-transparent"
            }`}
          >
            <div className="space-y-1">
              <Label className={assigneeError ? "text-destructive" : undefined}>
                {t("Assignees")}
                <span className="text-destructive"> *</span>
              </Label>
              <p
                className={`text-xs ${
                  assigneeError ? "text-destructive/90" : "text-muted-foreground"
                }`}
              >
                {t("Pick people, job roles, and/or branches.")}
              </p>
              {assigneeError ? (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {assigneeError}
                </p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                {t("Employees")}
              </p>
              <div
                className={`max-h-36 space-y-1 overflow-y-auto rounded-md border bg-background/60 p-2 ${
                  assigneeError ? "border-destructive" : "border-input"
                }`}
              >
                {employees.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={employeeIds.includes(e.id)}
                      onChange={() =>
                        toggleId(employeeIds, setEmployeeIds, e.id)
                      }
                    />
                    {e.name}
                  </label>
                ))}
                {!employees.length ? (
                  <p className="text-xs text-muted-foreground">
                    {t("No employees")}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("Job roles")}
                </p>
                <div
                  className={`max-h-28 space-y-1 overflow-y-auto rounded-md border bg-background/60 p-2 ${
                    assigneeError ? "border-destructive" : "border-input"
                  }`}
                >
                  {jobRoles.map((r) => (
                    <label
                      key={r.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={jobRoleIds.includes(r.id)}
                        onChange={() =>
                          toggleId(jobRoleIds, setJobRoleIds, r.id)
                        }
                      />
                      {r.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  {t("Branches")}
                </p>
                <div
                  className={`max-h-28 space-y-1 overflow-y-auto rounded-md border bg-background/60 p-2 ${
                    assigneeError ? "border-destructive" : "border-input"
                  }`}
                >
                  {branches.map((b) => (
                    <label
                      key={b.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={branchIds.includes(b.id)}
                        onChange={() =>
                          toggleId(branchIds, setBranchIds, b.id)
                        }
                      />
                      {b.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-tags">{t("Tags")}</Label>
            <Input
              id="task-tags"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder={t("Comma-separated badges")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("Required deliverables")}</Label>
            <div className="flex flex-wrap gap-2">
              {TASK_DELIVERABLE_TYPES.map((type) => {
                const on = deliverables.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    className={`rounded-full border px-3 py-1 text-xs ${
                      on
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground"
                    }`}
                    onClick={() =>
                      setDeliverables((prev) =>
                        on ? prev.filter((x) => x !== type) : [...prev, type],
                      )
                    }
                  >
                    {t(DELIVERABLE_TYPE_LABEL[type])}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("Attachments")}</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="file"
                className="w-full"
                onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
              />
            </div>
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
              <Button type="button" variant="outline" onClick={addLink}>
                {t("Add link")}
              </Button>
            </div>
            <ul className="space-y-1 text-sm">
              {attachments.map((a, i) => (
                <li
                  key={`${a.name}-${i}`}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 truncate">
                    {a.kind === "link" ? t("Link") : t("File")}: {a.name}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setAttachments((prev) => prev.filter((_, j) => j !== i))
                    }
                  >
                    {t("Remove")}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        </SheetBody>
        <SheetFooter className="flex-wrap">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            {t("Cancel")}
          </Button>
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={busy || !title.trim()}
            onClick={() => void submit()}
          >
            {busy ? t("Creating…") : t("Create task")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
