"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Candidate } from "@/lib/hiring/types";
import { t } from "@/i18n";

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
        <div className="rounded-lg border bg-surface-2/40 p-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            {t("Parsed fields (")}{parsed.source})
          </p>
          <p className="mt-2">{parsed.summary}</p>
          <dl className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <dt className="text-xs text-ink-muted">{t("Name")}</dt>
              <dd>{parsed.fullName ?? "-"}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">{t("Years")}</dt>
              <dd>{parsed.yearsOfExperience ?? "-"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-ink-muted">{t("Education")}</dt>
              <dd>{parsed.education ?? "-"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-ink-muted">{t("Skills")}</dt>
              <dd>{parsed.skills.join(", ") || "-"}</dd>
            </div>
          </dl>
          <p className="mt-2 text-[11px] text-ink-muted">
            {parsed.source === "extracted"
              ? t("Extracted in the browser. Confirm these fields on the record before you rely on them.")
              : t("Review or type over these fields on the candidate record.")}
          </p>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">
          {t("No resume parsed yet. Upload a PDF or Word file when you add a candidate, or attach a link below.")}</p>
      )}

      <ul className="space-y-2 text-sm">
        {candidate.attachments.map((a) => (
          <li key={a.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
            <span>
              <span className="font-medium">{a.name}</span>
              <span className="text-xs text-ink-muted"> · {a.kind.replace("_", " ")}</span>
            </span>
            <a href={a.url} className="text-xs text-primary hover:underline">
              {t("Preview")}</a>
          </li>
        ))}
      </ul>

      {canManage ? (
        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-xs font-medium">{t("Attach a file link")}</p>
          <Input placeholder={t("File name")} value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="https://… or local placeholder" value={url} onChange={(e) => setUrl(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onUpload("resume", name || t("resume.pdf"), url);
                setName("");
                setUrl("");
              }}
            >
              {t("Add as CV")}</Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                onUpload("cover_letter", name || t("cover-letter.pdf"), url);
                setName("");
                setUrl("");
              }}
            >
              {t("Cover letter")}</Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onUpload("other", name || "attachment", url);
                setName("");
                setUrl("");
              }}
            >
              {t("Other")}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
