"use client";

import { HatchBar, StatBlock } from "@/components/elevora";
import { formatDays, formatPercent, sourceLabel } from "@/lib/hiring/format";
import type { RecruitmentMetricSummary } from "@/lib/hiring/types";
import { t } from "@/i18n";

export function HiringReportsPanel({ summary }: { summary: RecruitmentMetricSummary }) {
  const totalApps = summary.sourcePerformance.reduce((a, s) => a + s.candidates, 0);
  const stats = [
    {
      label: t("Applications"),
      value: String(totalApps || summary.candidatesInPipeline),
    },
    {
      label: t("Offer accept rate"),
      value: formatPercent(summary.offerAcceptanceRate),
    },
    {
      label: t("Time to hire"),
      value: formatDays(summary.avgTimeToHireDays),
    },
    {
      label: t("Hires this month"),
      value: String(summary.hiresThisMonth),
    },
  ];

  const sources = summary.sourcePerformance
    .slice()
    .sort((a, b) => b.candidates - a.candidates);
  const maxSrc = Math.max(1, ...sources.map((s) => s.candidates));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="min-w-0 rounded-sm border border-line bg-surface px-4 py-3"
          >
            <StatBlock label={s.label} value={s.value} size="sm" />
          </div>
        ))}
      </div>

      <section className="rounded-sm border border-line bg-surface p-4">
        <h2 className="mb-3 text-base font-semibold text-ink">
          {t("Candidates by source")}
        </h2>
        {sources.length === 0 ? (
          <p className="text-sm text-ink-muted">{t("No sources recorded.")}</p>
        ) : (
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.source} className="flex items-center gap-3">
                <span className="w-[5.75rem] shrink-0 text-xs text-ink-muted">
                  {sourceLabel(s.source)}
                </span>
                <div className="min-w-0 flex-1">
                  <HatchBar
                    size="sm"
                    percent={(s.candidates / maxSrc) * 100}
                    tone="accent"
                    animate={false}
                  />
                </div>
                <b className="shrink-0 tabular-nums text-sm text-ink">{s.candidates}</b>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
