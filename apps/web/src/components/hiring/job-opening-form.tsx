"use client";

import { useState } from "react";
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
import { newId, SELECT_CLASS, TEXTAREA_CLASS, todayIso } from "@/lib/hiring/format";
import type { HiringStore } from "@/lib/hiring/store";
import type {
  EmploymentType,
  HiringActor,
  JobOpening,
  JobOpeningDraft,
  JobPriority,
  JobStatus,
  ScreeningQuestion,
} from "@/lib/hiring/types";
import {
  EMPLOYMENT_TYPES,
  JOB_PRIORITIES,
  JOB_STATUSES,
} from "@/lib/hiring/types";
import { employmentTypeLabel, jobStatusLabel, priorityLabel } from "@/lib/hiring/format";

function emptyDraft(store: HiringStore): JobOpeningDraft {
  const team = store.team();
  const first = team[0];
  return {
    title: "",
    department: "Operations",
    branchId: store.branches()[0]?.id ?? "",
    location: store.branches()[0]?.name ?? "",
    employmentType: "full_time",
    openingsCount: 1,
    hiringManagerId: first?.id ?? "",
    recruiterOwnerId: first?.id ?? "",
    priority: "medium",
    status: "open",
    openedAt: todayIso(),
    targetHireDate: "",
    salaryRangeMin: "",
    salaryRangeMax: "",
    description: "",
    requirements: "",
    responsibilities: "",
    screeningQuestions: [],
  };
}

function fromJob(job: JobOpening): JobOpeningDraft {
  return {
    title: job.title,
    department: job.department,
    branchId: job.branchId,
    location: job.location,
    employmentType: job.employmentType,
    openingsCount: job.openingsCount,
    hiringManagerId: job.hiringManagerId,
    recruiterOwnerId: job.recruiterOwnerId,
    priority: job.priority,
    status: job.status,
    openedAt: job.openedAt ?? todayIso(),
    targetHireDate: job.targetHireDate ?? "",
    salaryRangeMin: job.salaryRangeMin != null ? String(job.salaryRangeMin) : "",
    salaryRangeMax: job.salaryRangeMax != null ? String(job.salaryRangeMax) : "",
    description: job.description,
    requirements: job.requirements,
    responsibilities: job.responsibilities,
    screeningQuestions: job.screeningQuestions,
  };
}

export function JobOpeningForm({
  open,
  onOpenChange,
  store,
  actor,
  editing,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: HiringStore;
  actor: HiringActor;
  editing?: JobOpening | null;
  onSubmitted: () => void;
}) {
  const [form, setForm] = useState<JobOpeningDraft>(() =>
    editing ? fromJob(editing) : emptyDraft(store),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function patch(p: Partial<JobOpeningDraft>) {
    setForm((prev) => ({ ...prev, ...p }));
    setError(null);
  }

  function submit() {
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        store.updateJob(
          editing.id,
          {
            ...form,
            openingsCount: Number(form.openingsCount) || 1,
            salaryRangeMin: form.salaryRangeMin ? Number(form.salaryRangeMin) : null,
            salaryRangeMax: form.salaryRangeMax ? Number(form.salaryRangeMax) : null,
            openedAt: form.openedAt || null,
            targetHireDate: form.targetHireDate || null,
          },
          actor,
        );
      } else {
        store.createJob(form, actor);
      }
      onSubmitted();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setForm(editing ? fromJob(editing) : emptyDraft(store));
        onOpenChange(next);
      }}
    >
      <SheetContent className="max-w-xl">
        <SheetHeader>
          <SheetTitle>{editing ? "Edit job opening" : "New job opening"}</SheetTitle>
          <SheetDescription>
            A requisition is the source of truth for the pipeline, interviews, and offers.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-3">
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
              {error}
            </p>
          ) : null}
          <Field label="Job title">
            <Input value={form.title} onChange={(e) => patch({ title: e.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Department">
              <Input value={form.department} onChange={(e) => patch({ department: e.target.value })} />
            </Field>
            <Field label="Branch">
              <select
                className={SELECT_CLASS}
                value={form.branchId}
                onChange={(e) => {
                  const b = store.branches().find((x) => x.id === e.target.value);
                  patch({ branchId: e.target.value, location: form.location || b?.name || "" });
                }}
              >
                {store.branches().map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Location">
              <Input value={form.location} onChange={(e) => patch({ location: e.target.value })} />
            </Field>
            <Field label="Employment type">
              <select
                className={SELECT_CLASS}
                value={form.employmentType}
                onChange={(e) => patch({ employmentType: e.target.value as EmploymentType })}
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {employmentTypeLabel(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Openings">
              <Input
                type="number"
                min={1}
                value={form.openingsCount}
                onChange={(e) => patch({ openingsCount: Number(e.target.value) })}
              />
            </Field>
            <Field label="Priority">
              <select
                className={SELECT_CLASS}
                value={form.priority}
                onChange={(e) => patch({ priority: e.target.value as JobPriority })}
              >
                {JOB_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {priorityLabel(p)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hiring manager">
              <select
                className={SELECT_CLASS}
                value={form.hiringManagerId}
                onChange={(e) => patch({ hiringManagerId: e.target.value })}
              >
                {store.team().map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Recruiter">
              <select
                className={SELECT_CLASS}
                value={form.recruiterOwnerId}
                onChange={(e) => patch({ recruiterOwnerId: e.target.value })}
              >
                {store.team().map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status">
              <select
                className={SELECT_CLASS}
                value={form.status}
                onChange={(e) => patch({ status: e.target.value as JobStatus })}
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {jobStatusLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date opened">
              <Input type="date" value={form.openedAt} onChange={(e) => patch({ openedAt: e.target.value })} />
            </Field>
            <Field label="Target hire date">
              <Input
                type="date"
                value={form.targetHireDate}
                onChange={(e) => patch({ targetHireDate: e.target.value })}
              />
            </Field>
            <Field label="Salary min (placeholder)">
              <Input
                type="number"
                value={form.salaryRangeMin}
                onChange={(e) => patch({ salaryRangeMin: e.target.value })}
              />
            </Field>
            <Field label="Salary max (placeholder)">
              <Input
                type="number"
                value={form.salaryRangeMax}
                onChange={(e) => patch({ salaryRangeMax: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className={TEXTAREA_CLASS}
              value={form.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </Field>
          <Field label="Requirements">
            <textarea
              className={TEXTAREA_CLASS}
              value={form.requirements}
              onChange={(e) => patch({ requirements: e.target.value })}
            />
          </Field>
          <Field label="Responsibilities">
            <textarea
              className={TEXTAREA_CLASS}
              value={form.responsibilities}
              onChange={(e) => patch({ responsibilities: e.target.value })}
            />
          </Field>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Screening questions</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  patch({
                    screeningQuestions: [
                      ...form.screeningQuestions,
                      {
                        id: newId("sq"),
                        prompt: "",
                        type: "yes_no",
                        required: true,
                        knockout: false,
                        expectedAnswer: "yes",
                      },
                    ],
                  })
                }
              >
                Add question
              </Button>
            </div>
            {form.screeningQuestions.map((q, i) => (
              <QuestionEditor
                key={q.id}
                question={q}
                onChange={(next) => {
                  const screeningQuestions = form.screeningQuestions.slice();
                  screeningQuestions[i] = next;
                  patch({ screeningQuestions });
                }}
                onRemove={() =>
                  patch({
                    screeningQuestions: form.screeningQuestions.filter((x) => x.id !== q.id),
                  })
                }
              />
            ))}
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={busy} onClick={submit}>
            {busy ? "Saving…" : editing ? "Save opening" : "Create opening"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function QuestionEditor({
  question,
  onChange,
  onRemove,
}: {
  question: ScreeningQuestion;
  onChange: (q: ScreeningQuestion) => void;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Input
        placeholder="Question"
        value={question.prompt}
        onChange={(e) => onChange({ ...question, prompt: e.target.value })}
      />
      <div className="flex flex-wrap gap-2">
        <select
          className={`${SELECT_CLASS} w-auto`}
          value={question.type}
          onChange={(e) =>
            onChange({ ...question, type: e.target.value as ScreeningQuestion["type"] })
          }
        >
          <option value="yes_no">Yes / no</option>
          <option value="text">Text</option>
          <option value="number">Number</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={question.required}
            onChange={(e) => onChange({ ...question, required: e.target.checked })}
          />
          Required
        </label>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={question.knockout}
            onChange={(e) => onChange({ ...question, knockout: e.target.checked })}
          />
          Knockout
        </label>
        {question.knockout && question.type === "yes_no" ? (
          <select
            className={`${SELECT_CLASS} w-auto`}
            value={question.expectedAnswer ?? "yes"}
            onChange={(e) => onChange({ ...question, expectedAnswer: e.target.value })}
          >
            <option value="yes">Expect yes</option>
            <option value="no">Expect no</option>
          </select>
        ) : null}
        <Button type="button" size="sm" variant="ghost" onClick={onRemove}>
          Remove
        </Button>
      </div>
    </div>
  );
}
