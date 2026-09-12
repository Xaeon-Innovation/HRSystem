"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDays, formatPercent, sourceLabel, stageLabel } from "@/lib/hiring/format";
import type { RecruitmentMetricSummary } from "@/lib/hiring/types";
import { t } from "@/i18n";

export function HiringReportsPanel({ summary }: { summary: RecruitmentMetricSummary }) {
  const stats = [
    { label: t("Open roles"), value: String(summary.openPositions) },
    { label: t("Seats to fill"), value: String(summary.openingsHeadcount) },
    { label: t("Time to hire"), value: formatDays(summary.avgTimeToHireDays), hint: t("Pipeline entry → offer accepted") },
    { label: t("Time to fill"), value: formatDays(summary.avgTimeToFillDays), hint: t("Req open → offer accepted") },
    { label: t("Interview → offer"), value: formatPercent(summary.interviewToOfferRate) },
    { label: t("Offer acceptance"), value: formatPercent(summary.offerAcceptanceRate) },
    { label: t("Hires this month"), value: String(summary.hiresThisMonth) },
    { label: t("Stuck in stage"), value: String(summary.bottleneckCount) },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-1">
              <CardTitle className="text-xs font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold tabular-nums">{s.value}</p>
              {"hint" in s && s.hint ? (
                <p className="mt-1 text-[11px] text-muted-foreground">{s.hint}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Stage conversion")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.stageConversion.map((row) => (
              <div key={`${row.from}-${row.to}`}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>
                    {stageLabel(row.from)} → {stageLabel(row.to)}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.converted}/{row.entered} · {formatPercent(row.rate)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(row.rate ? 8 : 0, row.rate * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Source effectiveness")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.sourcePerformance.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("No sources recorded.")}</p>
            ) : (
              summary.sourcePerformance
                .slice()
                .sort((a, b) => b.hireRate - a.hireRate)
                .map((s) => (
                  <div key={s.source}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{sourceLabel(s.source)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {s.hired} {t("hired /")}{s.candidates} · {formatPercent(s.hireRate)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.max(s.hireRate ? 8 : 0, s.hireRate * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("Time in stage")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {summary.timeInStage.map((s) => (
                <li key={s.stage} className="rounded-lg border bg-card px-3 py-2">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-semibold tabular-nums">{formatDays(s.avgDays)}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
