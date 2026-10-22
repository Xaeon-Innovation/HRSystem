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
import {
  interviewModeLabel,
  interviewTypeLabel,
  SELECT_CLASS,
  TEXTAREA_CLASS,
} from "@/lib/hiring/format";
import type { HiringStore } from "@/lib/hiring/store";
import {
  INTERVIEW_MODES,
  INTERVIEW_TYPES,
  type HiringActor,
  type InterviewDraft,
  type InterviewMode,
  type InterviewType,
} from "@/lib/hiring/types";
import { t } from "@/i18n";

function localInputValue(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function InterviewScheduleForm({
  open,
  onOpenChange,
  store,
  actor,
  presetCandidateId,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: HiringStore;
  actor: HiringActor;
  presetCandidateId?: string | null;
  onSubmitted: () => void;
}) {
  const candidates = store.candidates(undefined, actor);
  const [form, setForm] = useState<InterviewDraft>(() => ({
    candidateId: presetCandidateId ?? candidates[0]?.id ?? "",
    type: "phone_screen",
    scheduledAt: "",
    durationMinutes: 30,
    mode: "online",
    interviewerIds: [],
    meetingLink: "",
    location: "",
    notes: "",
  }));
  const [error, setError] = useState<string | null>(null);

  function patch(p: Partial<InterviewDraft>) {
    setForm((prev) => ({ ...prev, ...p }));
    setError(null);
  }

  function submit() {
    try {
      const scheduledAt = form.scheduledAt ? new Date(form.scheduledAt).toISOString() : "";
      store.scheduleInterview({ ...form, scheduledAt }, actor);
      onSubmitted();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("Schedule interview")}</SheetTitle>
          <SheetDescription>{t("Tied to the candidate’s current stage. Sending is logged, not emailed yet.")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-3">
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">{error}</p>
          ) : null}
          <Field label="Candidate">
            <select
              className={SELECT_CLASS}
              value={form.candidateId}
              onChange={(e) => patch({ candidateId: e.target.value })}
            >
              {candidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}, {c.appliedJobTitle}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select
                className={SELECT_CLASS}
                value={form.type}
                onChange={(e) => patch({ type: e.target.value as InterviewType })}
              >
                {INTERVIEW_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {interviewTypeLabel(t)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Mode">
              <select
                className={SELECT_CLASS}
                value={form.mode}
                onChange={(e) => patch({ mode: e.target.value as InterviewMode })}
              >
                {INTERVIEW_MODES.map((m) => (
                  <option key={m} value={m}>
                    {interviewModeLabel(m)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Date and time">
              <Input
                type="datetime-local"
                value={localInputValue(form.scheduledAt) || form.scheduledAt}
                onChange={(e) => patch({ scheduledAt: e.target.value })}
              />
            </Field>
            <Field label="Duration (minutes)">
              <Input
                type="number"
                min={15}
                value={form.durationMinutes}
                onChange={(e) => patch({ durationMinutes: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Interviewers">
            <div className="flex flex-wrap gap-2">
              {store.team().map((t) => {
                const on = form.interviewerIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`inline-flex cursor-pointer items-center rounded-full border px-2.5 py-1 text-xs ${
                      on ? "border-primary bg-primary/10" : "border-input text-ink-muted"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={() =>
                        patch({
                          interviewerIds: on
                            ? form.interviewerIds.filter((id) => id !== t.id)
                            : [...form.interviewerIds, t.id],
                        })
                      }
                    />
                    {t.name}
                  </label>
                );
              })}
            </div>
          </Field>
          {form.mode === "online" ? (
            <Field label={t("Meeting link")}>
              <Input value={form.meetingLink} onChange={(e) => patch({ meetingLink: e.target.value })} />
            </Field>
          ) : (
            <Field label={t("Location")}>
              <Input value={form.location} onChange={(e) => patch({ location: e.target.value })} />
            </Field>
          )}
          <Field label="Notes">
            <textarea className={TEXTAREA_CLASS} value={form.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </Field>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}</Button>
          <Button type="button" onClick={submit}>
            {t("Schedule")}</Button>
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
