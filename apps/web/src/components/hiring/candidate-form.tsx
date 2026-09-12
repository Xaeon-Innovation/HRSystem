"use client";

import { useEffect, useRef, useState } from "react";
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
import { SELECT_CLASS, sourceLabel } from "@/lib/hiring/format";
import { extractResumeFromFile, tokenizeJobText, toParsedResume } from "@/lib/hiring/parse-resume";
import type { HiringStore } from "@/lib/hiring/store";
import {
  CANDIDATE_SOURCES,
  type CandidateDraft,
  type CandidateSource,
  type HiringActor,
} from "@/lib/hiring/types";
import { t } from "@/i18n";

function emptyDraft(store: HiringStore, actor: HiringActor): CandidateDraft {
  return {
    fullName: "",
    email: "",
    phone: "",
    appliedJobId: store.jobs(actor).find((j) => j.status === "open")?.id ?? "",
    source: "recruiter_upload",
    yearsOfExperience: "",
    skills: "",
    tags: "",
    expectedSalary: "",
    noticePeriod: "",
    availability: "",
    locationPreference: "",
    resumeUrl: "",
    coverLetterUrl: "",
    recruiterOwnerId: actor.employeeId || actor.id,
    parsedResume: null,
    resumeFileName: "",
  };
}

export function CandidateForm({
  open,
  onOpenChange,
  store,
  actor,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: HiringStore;
  actor: HiringActor;
  onSubmitted: (id: string) => void;
}) {
  const [form, setForm] = useState<CandidateDraft>(() => emptyDraft(store, actor));
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [parsing, setParsing] = useState(false);
  const blobUrl = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm(emptyDraft(store, actor));
    setError(null);
    setWarnings([]);
    // Reset only when the sheet opens — not when actor identity is a new object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    };
  }, []);

  function patch(p: Partial<CandidateDraft>) {
    setForm((prev) => ({ ...prev, ...p }));
    setError(null);
  }

  function extraSkills() {
    const job = form.appliedJobId ? store.job(form.appliedJobId) : undefined;
    if (!job) return [];
    return tokenizeJobText(job.title, job.requirements, job.description, job.responsibilities);
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setParsing(true);
    setError(null);
    try {
      const result = await extractResumeFromFile(file, extraSkills());
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
      const url = URL.createObjectURL(file);
      blobUrl.current = url;
      const fields = result.fields;
      setWarnings(result.warnings);
      patch({
        fullName: fields.fullName || form.fullName,
        email: fields.email || form.email,
        phone: fields.phone || form.phone,
        skills: fields.skills.length ? fields.skills.join(", ") : form.skills,
        yearsOfExperience:
          fields.yearsOfExperience != null ? String(fields.yearsOfExperience) : form.yearsOfExperience,
        resumeUrl: url,
        resumeFileName: file.name,
        parsedResume: result.rawText ? toParsedResume(fields) : form.parsedResume,
      });
    } catch {
      setError("Couldn’t read this file. Fill the form manually.");
    } finally {
      setParsing(false);
    }
  }

  function submit() {
    setBusy(true);
    try {
      const created = store.createCandidate(form, actor);
      onSubmitted(created.id);
      onOpenChange(false);
      if (blobUrl.current) {
        URL.revokeObjectURL(blobUrl.current);
        blobUrl.current = null;
      }
      setForm(emptyDraft(store, actor));
      setWarnings([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add candidate");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-xl">
        <SheetHeader>
          <SheetTitle>{t("Add candidate")}</SheetTitle>
          <SheetDescription>
            {t("Upload a PDF or Word CV to autofill. Review every field before you save.")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-3">
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
              {error}
            </p>
          ) : null}
          <Field label="Resume (PDF, Word, or text)">
            <Input
              type="file"
              accept=".pdf,.docx,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
              disabled={parsing}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            {parsing ? <p className="text-xs text-muted-foreground">{t("Reading CV in the browser…")}</p> : null}
            {form.resumeFileName ? (
              <p className="text-xs text-muted-foreground">{t("Attached:")}{form.resumeFileName}</p>
            ) : null}
          </Field>
          {warnings.length > 0 ? (
            <ul className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <Input value={form.fullName} onChange={(e) => patch({ fullName: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => patch({ email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </Field>
            <Field label="Role / job">
              <select
                className={SELECT_CLASS}
                value={form.appliedJobId}
                onChange={(e) => patch({ appliedJobId: e.target.value })}
              >
                <option value="">{t("Talent pool")}</option>
                {store.jobs(actor).map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Source">
              <select
                className={SELECT_CLASS}
                value={form.source}
                onChange={(e) => patch({ source: e.target.value as CandidateSource })}
              >
                {CANDIDATE_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {sourceLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Years of experience">
              <Input
                type="number"
                value={form.yearsOfExperience}
                onChange={(e) => patch({ yearsOfExperience: e.target.value })}
              />
            </Field>
            <Field label="Expected salary">
              <Input
                type="number"
                value={form.expectedSalary}
                onChange={(e) => patch({ expectedSalary: e.target.value })}
              />
            </Field>
            <Field label="Notice period">
              <Input value={form.noticePeriod} onChange={(e) => patch({ noticePeriod: e.target.value })} />
            </Field>
            <Field label="Availability">
              <Input value={form.availability} onChange={(e) => patch({ availability: e.target.value })} />
            </Field>
            <Field label="Location preference">
              <Input
                value={form.locationPreference}
                onChange={(e) => patch({ locationPreference: e.target.value })}
              />
            </Field>
            <Field label="Skills (comma-separated)">
              <Input value={form.skills} onChange={(e) => patch({ skills: e.target.value })} />
            </Field>
            <Field label="Tags">
              <Input value={form.tags} onChange={(e) => patch({ tags: e.target.value })} />
            </Field>
            <Field label="Resume URL / link">
              <Input
                value={form.resumeUrl.startsWith("blob:") ? "" : form.resumeUrl}
                onChange={(e) => patch({ resumeUrl: e.target.value, parsedResume: form.parsedResume })}
                placeholder={t("Optional link if you did not upload a file")}
              />
            </Field>
            <Field label="Cover letter URL">
              <Input
                value={form.coverLetterUrl}
                onChange={(e) => patch({ coverLetterUrl: e.target.value })}
              />
            </Field>
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}</Button>
          <Button type="button" disabled={busy || parsing} onClick={submit}>
            {busy ? t("Saving…") : t("Add candidate")}
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
