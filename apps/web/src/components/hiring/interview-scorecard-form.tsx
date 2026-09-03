"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
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
import { recommendationLabel, SELECT_CLASS, TEXTAREA_CLASS } from "@/lib/hiring/format";
import type { HiringStore } from "@/lib/hiring/store";
import { RECOMMENDATIONS, type HiringActor, type Interview, type Recommendation } from "@/lib/hiring/types";

export function InterviewScorecardForm({
  open,
  onOpenChange,
  store,
  actor,
  interview,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  store: HiringStore;
  actor: HiringActor;
  interview: Interview | null;
  onSubmitted: () => void;
}) {
  const [technical, setTechnical] = useState(3);
  const [communication, setCommunication] = useState(3);
  const [culture, setCulture] = useState(3);
  const [roleSkill, setRoleSkill] = useState(3);
  const [problem, setProblem] = useState(3);
  const [rec, setRec] = useState<Recommendation>("yes");
  const [comments, setComments] = useState("");
  const [hmNote, setHmNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!interview) return;
    try {
      store.submitScorecard(
        {
          interviewId: interview.id,
          technicalScore: technical,
          communicationScore: communication,
          cultureFitScore: culture,
          criteria: [
            { id: "role-skill", label: "Role-specific skill", score: roleSkill },
            { id: "problem", label: "Problem solving", score: problem },
          ],
          recommendation: rec,
          comments,
          hiringManagerNote: hmNote,
        },
        actor,
      );
      onSubmitted();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Interview scorecard</SheetTitle>
          <SheetDescription>
            {interview
              ? `${interview.candidateName} · ${interview.jobTitle}`
              : "Structured feedback so decisions are comparable."}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {error ? (
            <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">{error}</p>
          ) : null}
          <Score name="Technical" value={technical} onChange={setTechnical} />
          <Score name="Communication" value={communication} onChange={setCommunication} />
          <Score name="Culture / team fit" value={culture} onChange={setCulture} />
          <Score name="Role-specific skill" value={roleSkill} onChange={setRoleSkill} />
          <Score name="Problem solving" value={problem} onChange={setProblem} />
          <div className="space-y-1">
            <Label>Recommendation</Label>
            <select
              className={SELECT_CLASS}
              value={rec}
              onChange={(e) => setRec(e.target.value as Recommendation)}
            >
              {RECOMMENDATIONS.map((r) => (
                <option key={r} value={r}>
                  {recommendationLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Comments</Label>
            <textarea className={TEXTAREA_CLASS} value={comments} onChange={(e) => setComments(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Hiring manager decision note</Label>
            <textarea className={TEXTAREA_CLASS} value={hmNote} onChange={(e) => setHmNote(e.target.value)} />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit}>
            Submit scorecard
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Score({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <Label>{name}</Label>
        <span className="tabular-nums text-muted-foreground">{value}/5</span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}
