"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Chip,
  EmptyState,
  HatchBar,
  SegmentGauge,
} from "@/components/elevora";
import { KpiStatusBadge } from "@/components/kpis/kpi-status-badge";
import { formatKpiValue, formatNumber, formatPercent } from "@/lib/kpis/format";
import type { PersonPulse } from "@/lib/kpis/people";
import { t } from "@/i18n";

type CmsGoalsResponse = {
  linked: boolean;
  goals: Array<{
    id: string;
    title: string;
    category: string | null;
    status: string | null;
    valueAmount: number | null;
    occurredAt: string;
    completedAt: string | null;
  }>;
  total: { completionRate: number; status: string | null } | null;
};

/**
 * Employee Me layout (§5.14): overall gauge, local KPIs, CMS Goals.
 * Local KPI overall and CMS Goals stay in separate sections — never blended.
 */
export function KpiMePanel({
  person,
  periodLabel,
  onOpenMetric,
  onOpenScorecard,
  onAcknowledge,
}: {
  person: PersonPulse;
  periodLabel?: string;
  onOpenMetric: (kpiId: string) => void;
  onOpenScorecard: () => void;
  onAcknowledge?: (scoreIds: string[]) => Promise<void>;
}) {
  const [cms, setCms] = useState<CmsGoalsResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    api<CmsGoalsResponse>(
      `/v1/kpis/cms-goals?employeeId=${encodeURIComponent(person.employeeId)}`,
    )
      .then((res) => {
        if (!cancelled) setCms(res);
      })
      .catch(() => {
        if (!cancelled) setCms({ linked: false, goals: [], total: null });
      });
    return () => {
      cancelled = true;
    };
  }, [person.employeeId]);

  const score = person.overall;
  const pendingAck = person.metrics.filter(
    (m) => m.latestScoreId && !m.acknowledgedAt && !m.incomplete,
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-12">
        <Card className="border-line bg-surface p-4 lg:col-span-5">
          {score != null ? (
            <SegmentGauge
              percent={score}
              label={Math.round(score)}
              sub={periodLabel ? periodLabel : t("Overall")}
            />
          ) : (
            <div className="flex h-[118px] items-center justify-center rounded-sm border border-dashed border-line bg-surface-2 text-sm text-ink-muted">
              {t("No score yet")}
            </div>
          )}
          <p className="mt-3 text-xs text-ink-muted">
            {t("Local KPI overall only — CMS Goals are listed separately below.")}
          </p>
          {pendingAck.length > 0 && onAcknowledge ? (
            <Button
              size="sm"
              className="mt-3 w-full sm:w-auto"
              onClick={() =>
                void onAcknowledge(
                  pendingAck.map((m) => m.latestScoreId!).filter(Boolean),
                )
              }
            >
              {t("Got it, acknowledge all")}
            </Button>
          ) : null}
        </Card>

        <Card className="border-line bg-surface p-4 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">{t("Local KPIs")}</h3>
              <p className="text-xs text-ink-muted">
                {person.metricCount} {t("metrics with weights")}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={onOpenScorecard}
            >
              {t("Open scorecard")}
            </Button>
          </div>
          <ul className="mt-3 space-y-2">
            {person.metrics.map((m) => {
              const pct = m.achievementPercent;
              const bar = pct == null ? 0 : Math.max(0, Math.min(pct, 100));
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => onOpenMetric(m.id)}
                    className="w-full rounded-sm border border-line px-3 py-2.5 text-left hover:bg-surface-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-ink">
                        {m.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xs text-ink-muted">
                          {m.weight}%
                        </span>
                        <KpiStatusBadge status={m.status} />
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-ink-muted">
                      {t("Target")} {formatKpiValue(m.targetValue, m.unit)} ·{" "}
                      {t("Result")} {formatKpiValue(m.actualValue, m.unit)}
                      {pct != null
                        ? ` · ${formatPercent(pct, 0)} ${t("of target")}`
                        : ""}
                    </p>
                    <HatchBar
                      className="mt-2"
                      percent={bar}
                      size="xs"
                      tone={pct != null && pct < 75 ? "warn" : "accent"}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="border-line bg-surface p-4 lg:col-span-12">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">{t("CMS Goals")}</h3>
              <p className="text-xs text-ink-muted">
                {t("From CMS Goals, separate from local KPI overall")}
                {cms?.total?.completionRate != null
                  ? ` · ${t("CMS completion")} ${formatNumber(cms.total.completionRate, 0)}%`
                  : ""}
              </p>
            </div>
            {cms?.linked ? (
              <Chip tone="info">{t("Linked")}</Chip>
            ) : (
              <Chip tone="neutral">{t("Not linked")}</Chip>
            )}
          </div>

          {!cms ? (
            <p className="mt-3 text-sm text-ink-muted">{t("Loading CMS Goals…")}</p>
          ) : !cms.linked ? (
            <EmptyState
              icon={<Target className="h-5 w-5" />}
              title={t("CMS Goals not linked")}
              subtitle={t("When the CMS Goals integration is connected, goals appear here — not mixed into your local KPI score.")}
            />
          ) : cms.goals.length === 0 ? (
            <p className="mt-3 text-sm text-ink-muted">
              {t("No CMS goals linked for this person yet.")}
            </p>
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {cms.goals.slice(0, 12).map((g) => (
                <li
                  key={g.id}
                  className="rounded-sm border border-line bg-surface-2 px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-ink">{g.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {[g.category, g.status].filter(Boolean).join(" · ") ||
                      t("CMS Goal")}
                    {g.valueAmount != null
                      ? ` · ${formatNumber(g.valueAmount, 1)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
