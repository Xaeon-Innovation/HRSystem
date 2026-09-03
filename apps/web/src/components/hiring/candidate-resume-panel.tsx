"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Candidate } from "@/lib/hiring/types";

export function CandidateResumePanel({
  candidate,
  canManage,
  onUpload,
}: {
  candidate: Candidate;
  canManage: boolean;
  onUpload: (kind: "resume" | "cover_letter" | "other", name: string, url: string) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const parsed = candidate.parsedResume;

  return (
    <div className="space-y-4">
      {parsed ? (
        <div className="rounded-lg border bg-secondary/40 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Parsed fields ({parsed.source})
          </p>
          <p className="mt-2">{parsed.summary}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd>{parsed.fullName ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Years</dt>
              <dd>{parsed.yearsOfExperience ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Education</dt>
              <dd>{parsed.education ?? "—"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Skills</dt>
              <dd>{parsed.skills.join(", ") || "—"}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {parsed.source === "extracted"
              ? "Extracted in the browser. Confirm these fields on the record before you rely on them."
              : "Review or type over these fields on the candidate record."}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No resume parsed yet. Upload a PDF or Word file when you add a candidate, or attach a link below.
        </p>
      )}

      <ul className="space-y-2 text-sm">
        {candidate.attachments.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <span>
              <span className="font-medium">{a.name}</span>
              <span className="text-xs text-muted-foreground"> · {a.kind.replace("_", " ")}</span>
            </span>
            <a href={a.url} className="text-xs text-primary hover:underline">
              Preview
            </a>
          </li>
        ))}
      </ul>

      {canManage ? (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-medium">Attach a file link</p>
          <Input placeholder="File name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="https://… or local placeholder" value={url} onChange={(e) => setUrl(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onUpload("resume", name || "resume.pdf", url);
                setName("");
                setUrl("");
              }}
            >
              Add as CV
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onUpload("cover_letter", name || "cover-letter.pdf", url);
                setName("");
                setUrl("");
              }}
            >
              Cover letter
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onUpload("other", name || "attachment", url);
                setName("");
                setUrl("");
              }}
            >
              Other
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
