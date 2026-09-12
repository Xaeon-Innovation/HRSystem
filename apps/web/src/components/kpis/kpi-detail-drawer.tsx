"use client";

import { FormEvent, useState, type ReactNode } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KpiStatusBadge } from "@/components/kpis/kpi-status-badge";
import { formatDate, formatKpiValue, formatPercent } from "@/lib/kpis/format";
import { recommendationsFor } from "@/lib/kpis/templates";
import type { ScoredKpi } from "@/lib/kpis/types";
import { t } from "@/i18n";

export function KpiDetailDrawer({
  kpi,
  open,
  onOpenChange,
  isAdmin,
  onRecordScore,
  onAcknowledge,
}: {
  kpi: ScoredKpi | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
  onRecordScore: (assignmentId: string, score: number, notes: string) => Promise<void>;
  onAcknowledge?: (scoreId: string) => Promise<void>;
}) {
  const [showMath, setShowMath] = useState(false);
  const [ackBusy, setAckBusy] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        {kpi ? (
          <>
            <SheetHeader>
              <SheetTitle>{kpi.title}</SheetTitle>
              <SheetDescription>
                {kpi.employeeName ? `${kpi.employeeName} · ` : ""}
                {t("Target vs result")}</SheetDescription>
            </SheetHeader>
            <SheetBody className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <KpiStatusBadge status={kpi.status} />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{kpi.description}</p>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Fact label={t("Target")} value={formatKpiValue(kpi.targetValue, kpi.unit)} />
                <Fact label={t("Result")} value={formatKpiValue(kpi.actualValue, kpi.unit)} />
                <Fact label={t("% of target")} value={formatPercent(kpi.achievementPercent, 0)} />
                <Fact label={t("How much it counts")} value={`Weight ${kpi.weight}`} />
              </dl>

              {isAdmin && kpi.assignmentId ? (
                <RecordScoreForm
                  targetHint={formatKpiValue(kpi.targetValue, kpi.unit)}
                  onSubmit={async (score, notes) => {
                    await onRecordScore(kpi.assignmentId!, score, notes);
                  }}
                />
              ) : null}

              {!isAdmin &&
              onAcknowledge &&
              kpi.latestScoreId &&
              !kpi.acknowledgedAt &&
              !kpi.incomplete ? (
                <div className="rounded-lg border border-primary/20 bg-accent/40 p-3">
                  <p className="text-sm font-medium">{t("Acknowledge this result")}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("Soft confirmation that you have seen this period’s result.")}</p>
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    disabled={ackBusy}
                    onClick={async () => {
                      setAckBusy(true);
                      try {
                        await onAcknowledge(kpi.latestScoreId!);
                      } finally {
                        setAckBusy(false);
                      }
                    }}
                  >
                    {ackBusy ? t("Saving…") : t("Got it")}
                  </Button>
                </div>
              ) : null}

              {!kpi.incomplete && kpi.acknowledgedAt ? (
                <p className="text-xs text-muted-foreground">
                  {t("Acknowledged")}{formatDate(kpi.acknowledgedAt)}
                </p>
              ) : null}

              <Section title={t("How this is scored")}>
                <p className="text-sm text-muted-foreground">
                  {kpi.direction === "lower"
                    ? t("Lower results are better. Score is target ÷ result.")
                    : t("Higher results are better. Score is result ÷ target.")}{" "}
                  {t("That percentage is multiplied by this metric’s weight, then averaged with the others.")}</p>
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-primary hover:underline"
                  onClick={() => setShowMath((v) => !v)}
                >
                  {showMath ? t("Hide formula") : t("Show formula")}
                </button>
                {showMath ? (
                  <code className="mt-2 block rounded-md bg-secondary px-3 py-2 text-xs leading-relaxed">
                    {kpi.formula}
                  </code>
                ) : null}
              </Section>

              <Section title={t("Past results")}>
                {kpi.history.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("No results recorded yet.")}</p>
                ) : (
                  <ul className="space-y-2">
                    {kpi.history.map((h) => (
                      <li
                        key={h.reviewDate + String(h.actualValue)}
                        className="flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                      >
                        <div>
                          <p className="font-medium">{formatDate(h.reviewDate)}</p>
                          <p className="text-xs text-muted-foreground">{h.notes || t("No note")}</p>
                        </div>
                        <p className="tabular-nums">{formatKpiValue(h.actualValue, kpi.unit)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {kpi.notes ? (
                <Section title={t("Manager note")}>
                  <p className="text-sm">{kpi.notes}</p>
                </Section>
              ) : null}

              <Section title={t("Suggested next step")}>
                <ul className="list-disc space-y-1 pl-4 text-sm">
                  {recommendationsFor(kpi.templateKey, kpi.roleScope).slice(0, 2).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                  {recommendationsFor(kpi.templateKey, kpi.roleScope).length === 0 ? (
                    <li className="list-none pl-0 text-muted-foreground">
                      {t("Keep this metric at or above the target next period.")}</li>
                  ) : null}
                </ul>
              </Section>
            </SheetBody>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/60 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}

function RecordScoreForm({
  targetHint,
  onSubmit,
}: {
  targetHint: string;
  onSubmit: (score: number, notes: string) => Promise<void>;
}) {
  const [score, setScore] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit(Number(score), notes);
      setScore("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-3 rounded-lg border border-primary/20 bg-accent/40 p-3">
      <p className="text-sm font-medium">{t("Enter this period’s result")}</p>
      <p className="text-xs text-muted-foreground">
        {t("Type the actual number (same unit as the target of")}{targetHint}{t("). This is not filled in from clock-ins or jobs.")}</p>
      <div className="space-y-1">
        <Label>{t("Result")}</Label>
        <Input
          type="number"
          step="any"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          required
          placeholder={t("e.g. 38")}
        />
      </div>
      <div className="space-y-1">
        <Label>{t("Note (optional)")}</Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t("Why this number, or what to do next")}
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy} className="w-full">
        {busy ? t("Saving…") : t("Save result")}
      </Button>
    </form>
  );
}
