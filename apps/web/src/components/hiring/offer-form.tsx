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
import { addDaysIso, SELECT_CLASS, TEXTAREA_CLASS, todayIso } from "@/lib/hiring/format";
import type { HiringStore } from "@/lib/hiring/store";
import type { HiringActor, OfferDraft } from "@/lib/hiring/types";
import { t } from "@/i18n";

export function OfferForm({
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
  onSubmitted: (id: string) => void;
}) {
  const ready = store
    .candidates(undefined, actor)
    .filter((c) => c.appliedJobId && c.currentStage !== "rejected" && c.status !== "hired");
  const first = presetCandidateId ?? ready[0]?.id ?? "";
  const cand = store.candidate(first);
  const [form, setForm] = useState<OfferDraft>({
    candidateId: first,
    offeredTitle: cand?.appliedJobTitle ?? "",
    offeredSalary: "",
    benefitsNotes: "",
    offerDate: todayIso(),
    expiryDate: addDaysIso(todayIso(), 14),
    expectedJoinDate: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);

  function patch(p: Partial<OfferDraft>) {
    setForm((prev) => ({ ...prev, ...p }));
    setError(null);
  }

  function submit() {
    try {
      const created = store.createOffer(form, actor);
      onSubmitted(created.id);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create offer");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("New offer")}</SheetTitle>
          <SheetDescription>{t("Salary and benefits are placeholders until payroll is wired.")}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-3">
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">{error}</p>
          ) : null}
          <div className="space-y-1">
            <Label>{t("Candidate")}</Label>
            <select
              className={SELECT_CLASS}
              value={form.candidateId}
              onChange={(e) => {
                const next = store.candidate(e.target.value);
                patch({
                  candidateId: e.target.value,
                  offeredTitle: next?.appliedJobTitle ?? form.offeredTitle,
                });
              }}
            >
              {ready.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.fullName}, {c.appliedJobTitle}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>{t("Offered title")}</Label>
            <Input value={form.offeredTitle} onChange={(e) => patch({ offeredTitle: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>{t("Offered salary (placeholder)")}</Label>
            <Input
              type="number"
              value={form.offeredSalary}
              onChange={(e) => patch({ offeredSalary: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label>{t("Offer date")}</Label>
              <Input type="date" value={form.offerDate} onChange={(e) => patch({ offerDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("Expiry")}</Label>
              <Input type="date" value={form.expiryDate} onChange={(e) => patch({ expiryDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{t("Expected join date")}</Label>
              <Input
                type="date"
                value={form.expectedJoinDate}
                onChange={(e) => patch({ expectedJoinDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{t("Benefits / notes")}</Label>
            <textarea
              className={TEXTAREA_CLASS}
              value={form.benefitsNotes}
              onChange={(e) => patch({ benefitsNotes: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("Internal notes")}</Label>
            <textarea className={TEXTAREA_CLASS} value={form.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("Cancel")}</Button>
          <Button type="button" onClick={submit}>
            {t("Save draft")}</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
