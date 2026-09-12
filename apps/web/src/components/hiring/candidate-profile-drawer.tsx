"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { UserAvatar } from "@/components/user-avatar";
import {
  CandidateStatusBadge,
  OfferStatusBadge,
  RecommendationBadge,
  SourceChip,
  StageBadge,
  TagChip,
} from "@/components/hiring/hiring-status-badge";
import { CandidateResumePanel } from "@/components/hiring/candidate-resume-panel";
import { FitScoreBadge, FitScoreBreakdown } from "@/components/hiring/fit-score-badge";
import { ScreeningQuestionsPanel } from "@/components/hiring/screening-questions-panel";
import {
  commEventLabel,
  formatDate,
  formatDateTime,
  formatMoney,
  interviewTypeLabel,
  noteVisibilityLabel,
  SELECT_CLASS,
  stageLabel,
  TEXTAREA_CLASS,
} from "@/lib/hiring/format";
import { CANDIDATE_STAGES, NOTE_VISIBILITY, type Candidate, type CandidateStage, type HiringActor, type NoteVisibility } from "@/lib/hiring/types";
import type { HiringStore } from "@/lib/hiring/store";
import { api } from "@/lib/api";
import { t } from "@/i18n";

export function CandidateProfileDrawer({
  candidate,
  store,
  actor,
  open,
  onOpenChange,
  canManage,
  canMove,
  canConvert,
  duplicate,
  onMove,
  onSchedule,
  onScore,
  onOffer,
  onConvert,
  onChanged,
  onRemoved,
}: {
  candidate: Candidate | null;
  store: HiringStore;
  actor: HiringActor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
  canMove: boolean;
  canConvert: boolean;
  duplicate: boolean;
  onMove: (id: string, stage: CandidateStage) => void;
  onSchedule: (candidateId: string) => void;
  onScore: (interviewId: string) => void;
  onOffer: (candidateId: string) => void;
  onConvert: (candidateId: string) => void;
  onChanged: () => void;
  onRemoved: () => void;
}) {
  const [note, setNote] = useState("");
  const [visibility, setVisibility] = useState<NoteVisibility>("internal");
  const [tagInput, setTagInput] = useState("");
  const [commTpl, setCommTpl] = useState(store.templates()[0]?.id ?? "");
  const [tab, setTab] = useState("overview");
  const [bestFitNote, setBestFitNote] = useState("");
  const [pendingRemove, setPendingRemove] = useState(false);
  const [pendingReject, setPendingReject] = useState(false);
  const [keepTalentPool, setKeepTalentPool] = useState(true);
  const [keepBestFit, setKeepBestFit] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!candidate) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="max-w-xl" />
      </Sheet>
    );
  }

  const job = candidate.appliedJobId ? store.job(candidate.appliedJobId) : undefined;
  const interviews = store.interviews(actor).filter((i) => i.candidateId === candidate.id);
  const scorecards = store.scorecardsForCandidate(candidate.id);
  const offer = store.offerForCandidate(candidate.id);
  const activity = store.activity(candidate.id);
  const comms = store.communications(candidate.id);
  const fit = store.fitFor(candidate);
  const convertible =
    canConvert &&
    !candidate.convertedEmployeeId &&
    (candidate.currentStage === "hired" || candidate.currentStage === "offer_accepted");

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-xl">
        <SheetHeader>
          <div className="flex items-start gap-3">
            <UserAvatar name={candidate.fullName} size="lg" />
            <div className="min-w-0">
              <SheetTitle>{candidate.fullName}</SheetTitle>
              <SheetDescription>
                {candidate.appliedJobTitle} · {candidate.recruiterOwnerName}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={candidate.currentStage} />
            <CandidateStatusBadge status={candidate.status} />
            <SourceChip source={candidate.source} />
            <FitScoreBadge result={fit} />
            {duplicate ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-amber-900">
                {t("Possible duplicate")}</span>
            ) : null}
          </div>

          {canMove ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted-foreground">{t("Move stage")}</span>
              <select
                className={SELECT_CLASS}
                value={candidate.currentStage}
                onChange={(e) => onMove(candidate.id, e.target.value as CandidateStage)}
              >
                {CANDIDATE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {stageLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => onSchedule(candidate.id)}>
                {t("Schedule interview")}</Button>
            ) : null}
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => onOffer(candidate.id)}>
                {t("Create offer")}</Button>
            ) : null}
            {convertible ? (
              <Button size="sm" onClick={() => onConvert(candidate.id)}>
                {t("Convert to employee")}</Button>
            ) : null}
            {candidate.convertedEmployeeId ? (
              <a
                href="/app/employees"
                className="inline-flex h-9 items-center rounded-md border px-3 text-sm hover:bg-accent"
              >
                {t("View employee roster")}</a>
            ) : null}
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => setPendingReject(true)}>
                {t("Reject")}</Button>
            ) : null}
            {canManage ? (
              <Button size="sm" variant="outline" onClick={() => setPendingRemove(true)}>
                {t("Remove")}</Button>
            ) : null}
          </div>

          {canManage ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium">{t("Save as best fit")}</p>
              <p className="text-[11px] text-muted-foreground">
                {t("Keeps this contact on the Best fit bench for a later opening.")}</p>
              <textarea
                className={TEXTAREA_CLASS}
                rows={2}
                placeholder={t("Optional note (salary band, follow-up, etc.)")}
                value={bestFitNote}
                onChange={(e) => setBestFitNote(e.target.value)}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  try {
                    store.saveBestFit(candidate.id, actor, bestFitNote);
                    setBestFitNote("");
                    onChanged();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                {t("Save as best fit")}</Button>
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="overview" className="flex-none px-3">
                {t("Overview")}</TabsTrigger>
              <TabsTrigger value="resume" className="flex-none px-3">
                {t("Resume")}</TabsTrigger>
              <TabsTrigger value="interviews" className="flex-none px-3">
                {t("Interviews")}</TabsTrigger>
              <TabsTrigger value="notes" className="flex-none px-3">
                {t("Notes")}</TabsTrigger>
              <TabsTrigger value="activity" className="flex-none px-3">
                {t("Activity")}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4 space-y-4">
              <FitScoreBreakdown result={fit} />
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Fact label="Email" value={candidate.email} />
                <Fact label="Phone" value={candidate.phone || "—"} />
                <Fact label="Experience" value={`${candidate.yearsOfExperience} years`} />
                <Fact label="Rating" value={candidate.rating ? `${candidate.rating}/5` : "—"} />
                <Fact label="Expected salary" value={formatMoney(candidate.expectedSalary)} />
                <Fact label="Notice" value={candidate.noticePeriod || "—"} />
                <Fact label="Availability" value={candidate.availability || "—"} />
                <Fact label="Location" value={candidate.locationPreference || "—"} />
              </dl>
              <div className="flex flex-wrap gap-1">
                {candidate.skills.map((s) => (
                  <TagChip key={s} label={s} />
                ))}
                {candidate.tags.map((t) => (
                  <TagChip key={t} label={t} />
                ))}
              </div>
              {canManage ? (
                <div className="flex gap-2">
                  <Input
                    placeholder={t("Add tag")}
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const t = tagInput.trim();
                      if (!t) return;
                      store.setTags(candidate.id, [...new Set([...candidate.tags, t])], actor);
                      setTagInput("");
                      onChanged();
                    }}
                  >
                    {t("Tag")}</Button>
                </div>
              ) : null}
              <ScreeningQuestionsPanel
                questions={job?.screeningQuestions ?? []}
                answers={candidate.screeningAnswers}
                assessmentStatus={candidate.assessmentStatus}
                assessmentScore={candidate.assessmentScore}
              />
              {offer ? (
                <div className="rounded-lg border p-3 text-sm">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-medium">{t("Offer")}</p>
                    <OfferStatusBadge status={offer.status} />
                  </div>
                  <p>
                    {offer.offeredTitle} · {formatMoney(offer.offeredSalary, offer.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("Join")}{formatDate(offer.expectedJoinDate)} {t("· expires")}{formatDate(offer.expiryDate)}
                  </p>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="resume" className="mt-4">
              <CandidateResumePanel
                candidate={candidate}
                canManage={canManage}
                onUpload={(kind, name, url) => {
                  store.addAttachment(candidate.id, { kind, name, url }, actor);
                  onChanged();
                }}
              />
            </TabsContent>

            <TabsContent value="interviews" className="mt-4 space-y-3">
              {interviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No interviews scheduled.")}</p>
              ) : (
                interviews.map((i) => (
                  <div key={i.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">
                      {interviewTypeLabel(i.type)} · {formatDateTime(i.scheduledAt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {i.interviewerNames.join(", ")} · {i.status} · {i.outcome}
                    </p>
                    <Button size="sm" className="mt-2" variant="outline" onClick={() => onScore(i.id)}>
                      {t("Scorecard")}</Button>
                  </div>
                ))
              )}
              {scorecards.map((s) => (
                <div key={s.id} className="rounded-lg border bg-secondary/40 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{s.interviewerName}</p>
                    <RecommendationBadge value={s.recommendation} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Tech")}{s.technicalScore} {t("· Comm")}{s.communicationScore} {t("· Fit")}{s.cultureFitScore}
                  </p>
                  {s.comments ? <p className="mt-2">{s.comments}</p> : null}
                  {s.hiringManagerNote ? (
                    <p className="mt-1 text-muted-foreground">{t("HM:")}{s.hiringManagerNote}</p>
                  ) : null}
                </div>
              ))}
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-3">
              {canManage || canMove ? (
                <div className="space-y-2">
                  <textarea
                    className={TEXTAREA_CLASS}
                    placeholder={t("Internal note — @mentions are stored as text for now")}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <select
                      className={`${SELECT_CLASS} w-auto`}
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as NoteVisibility)}
                    >
                      {NOTE_VISIBILITY.map((v) => (
                        <option key={v} value={v}>
                          {noteVisibilityLabel(v)}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!note.trim()) return;
                        store.addNote(candidate.id, note, visibility, actor);
                        setNote("");
                        onChanged();
                      }}
                    >
                      {t("Add note")}</Button>
                  </div>
                </div>
              ) : null}
              {candidate.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No notes yet.")}</p>
              ) : (
                [...candidate.notes]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((n) => (
                    <div key={n.id} className="rounded-lg border p-3 text-sm">
                      <p className="text-xs text-muted-foreground">
                        {n.authorName} · {noteVisibilityLabel(n.visibility)} · {formatDateTime(n.createdAt)}
                        {n.mentionPlaceholder ? t(" · @mention") : ""}
                      </p>
                      <p className="mt-1">{n.body}</p>
                    </div>
                  ))
              )}

              <div className="border-t pt-3">
                <p className="mb-2 text-sm font-medium">{t("Communication")}</p>
                <p className="mb-2 text-xs text-muted-foreground">
                  {t("Templates are logged. Sending is mocked until email is connected.")}</p>
                {canManage ? (
                  <div className="mb-3 flex gap-2">
                    <select
                      className={SELECT_CLASS}
                      value={commTpl}
                      onChange={(e) => setCommTpl(e.target.value)}
                    >
                      {store.templates().map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        void store
                          .sendCommunication(
                            candidate.id,
                            commTpl,
                            actor,
                            undefined,
                            async (input) => {
                              const res = await api<{
                                ok: boolean;
                                reason?: string;
                              }>("/v1/hiring/send-email", {
                                method: "POST",
                                body: JSON.stringify(input),
                              });
                              return res;
                            },
                          )
                          .then(() => onChanged())
                          .catch(() => onChanged());
                      }}
                    >
                      {t("Send email")}</Button>
                  </div>
                ) : null}
                {comms.map((c) => (
                  <div key={c.id} className="mb-2 rounded-lg border p-3 text-sm">
                    <p className="font-medium">{c.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {commEventLabel(c.event)} · {c.status.replace("_", " ")} · {formatDateTime(c.sentAt)}
                    </p>
                    <p className="mt-1 text-muted-foreground">{c.body}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              {activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("No activity yet.")}</p>
              ) : (
                <ol className="space-y-3">
                  {activity.map((e) => (
                    <li key={e.id} className="relative pl-4 text-sm">
                      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <p className="font-medium">
                        {e.kind.replace("_", " ")} · {e.actorName}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(e.at)}</p>
                      {e.note ? <p className="mt-0.5 text-muted-foreground">{e.note}</p> : null}
                    </li>
                  ))}
                </ol>
              )}
              <div className="mt-4">
                <p className="mb-2 text-sm font-medium">{t("Stage history")}</p>
                <ul className="space-y-1 text-sm">
                  {candidate.stageHistory.map((h, i) => (
                    <li key={`${h.stage}-${i}`} className="text-muted-foreground">
                      {stageLabel(h.stage)} · {formatDateTime(h.enteredAt)}
                      {h.leftAt ? ` → ${formatDateTime(h.leftAt)}` : t(" · current")}
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </SheetBody>
      </SheetContent>
    </Sheet>
    <ConfirmDialog
      open={pendingReject}
      title={`Reject ${candidate.fullName}?`}
      description="They leave this pipeline. Save them as best fit if you may hire them later."
      confirmLabel="Reject"
      variant="destructive"
      busy={busy}
      onConfirm={() => {
        setBusy(true);
        try {
          if (keepBestFit) store.saveBestFit(candidate.id, actor, bestFitNote);
          store.rejectCandidate(candidate.id, actor, keepTalentPool, "Rejected from profile");
          setPendingReject(false);
          onChanged();
        } finally {
          setBusy(false);
        }
      }}
      onOpenChange={(open) => {
        if (!open && !busy) setPendingReject(false);
      }}
    >
      <div className="mt-3 space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={keepTalentPool}
            onChange={(e) => setKeepTalentPool(e.target.checked)}
          />
          {t("Keep in talent pool")}</label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={keepBestFit}
            onChange={(e) => setKeepBestFit(e.target.checked)}
          />
          {t("Keep as best fit for this role")}</label>
      </div>
    </ConfirmDialog>
    <ConfirmDialog
      open={pendingRemove}
      title={`Remove “${candidate.fullName}”?`}
      description="This deletes the person and their interviews, offers, notes, and best-fit drafts. Save as best fit first if you might need the contact."
      confirmLabel="Remove"
      variant="destructive"
      busy={busy}
      onConfirm={() => {
        setBusy(true);
        try {
          store.removeCandidate(candidate.id, actor);
          setPendingRemove(false);
          onRemoved();
        } finally {
          setBusy(false);
        }
      }}
      onOpenChange={(open) => {
        if (!open && !busy) setPendingRemove(false);
      }}
    />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="break-all">{value}</dd>
    </div>
  );
}
