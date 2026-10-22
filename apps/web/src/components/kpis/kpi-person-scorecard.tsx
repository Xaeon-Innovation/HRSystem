"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { KpiStatusBadge } from "@/components/kpis/kpi-status-badge";
import { KpiBenchmarks } from "@/components/kpis/kpi-benchmarks";
import { UserAvatar } from "@/components/user-avatar";
import { formatKpiValue, formatNumber, formatPercent } from "@/lib/kpis/format";
import { computeBenchmarks } from "@/lib/kpis/adapt";
import type { PersonPulse } from "@/lib/kpis/people";
import type {
  BenchmarkSet,
  EmployeeOption,
  KpiItem,
  ScoredKpi,
} from "@/lib/kpis/types";
import { cn } from "@/lib/utils";
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

export function KpiPersonScorecard({
  person,
  open,
  onOpenChange,
  allItems,
  employees,
  isAdmin,
  onOpenMetric,
  onAcknowledge,
}: {
  person: PersonPulse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allItems: KpiItem[];
  employees: EmployeeOption[];
  isAdmin: boolean;
  onOpenMetric: (kpiId: string) => void;
  onAcknowledge?: (scoreIds: string[]) => Promise<void>;
}) {
  const [cms, setCms] = useState<CmsGoalsResponse | null>(null);
  const [ackBusy, setAckBusy] = useState(false);

  useEffect(() => {
    if (!open || !person) {
      setCms(null);
      return;
    }
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
  }, [open, person?.employeeId]);

  const benchmarks: BenchmarkSet | null = person
    ? computeBenchmarks(
        person.metrics,
        allItems,
        employees,
        person.employeeId,
        "",
      )
    : null;

  const pendingAck = (person?.metrics ?? []).filter(
    (m) => m.latestScoreId && !m.acknowledgedAt && !m.incomplete,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        {person ? (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={person.name}
                  avatarUrl={person.avatarUrl}
                  className="h-11 w-11"
                />
                <div className="min-w-0">
                  <SheetTitle className="truncate">{person.name}</SheetTitle>
                  <SheetDescription>
                    {person.jobTitle || t("Scorecard")} {t("· Overall")}{" "}
                    {person.overall == null
                      ? "-"
                      : formatNumber(person.overall, 0)}
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>
            <SheetBody className="space-y-6">
              {!isAdmin && pendingAck.length > 0 && onAcknowledge ? (
                <div className="rounded-sm border border-accent/30 bg-accent-tint p-3">
                  <p className="text-sm font-medium text-ink">
                    {pendingAck.length} {t("new result")}{pendingAck.length === 1 ? "" : "s"} {t("to acknowledge")}</p>
                  <Button
                    className="mt-2 w-full sm:w-auto"
                    size="sm"
                    disabled={ackBusy}
                    onClick={async () => {
                      setAckBusy(true);
                      try {
                        await onAcknowledge(
                          pendingAck
                            .map((m) => m.latestScoreId!)
                            .filter(Boolean),
                        );
                      } finally {
                        setAckBusy(false);
                      }
                    }}
                  >
                    {ackBusy ? t("Saving…") : t("Got it, acknowledge all")}
                  </Button>
                </div>
              ) : null}

              <section>
                <h3 className="text-sm font-semibold text-ink">{t("Local KPIs")}</h3>
                <p className="mt-0.5 text-xs text-ink-muted">
                  {t("Local targets and results for this period — separate from CMS Goals")}
                </p>
                <ul className="mt-3 space-y-2">
                  {person.metrics.map((m) => (
                    <MetricRow
                      key={m.id}
                      metric={m}
                      isAdmin={isAdmin}
                      onOpen={() => onOpenMetric(m.id)}
                      onAck={
                        !isAdmin &&
                        m.latestScoreId &&
                        !m.acknowledgedAt &&
                        !m.incomplete &&
                        onAcknowledge
                          ? async () => onAcknowledge([m.latestScoreId!])
                          : undefined
                      }
                    />
                  ))}
                </ul>
              </section>

              {benchmarks ? (
                <section>
                  <h3 className="text-sm font-semibold text-ink">{t("How you compare")}</h3>
                  <div className="mt-2">
                    <KpiBenchmarks
                      overall={person.overall}
                      benchmarks={benchmarks}
                    />
                  </div>
                </section>
              ) : null}

              {cms?.linked ? (
                <section className="rounded-sm border border-line bg-surface-2 p-3">
                  <h3 className="text-sm font-semibold text-ink">{t("CMS Goals")}</h3>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {t("From CMS Goals, separate from local KPI overall")}
                    {cms.total?.completionRate != null
                      ? ` · CMS completion ${formatNumber(cms.total.completionRate, 0)}%`
                      : ""}
                  </p>
                  {cms.goals.length === 0 ? (
                    <p className="mt-2 text-sm text-ink-muted">
                      {t("No CMS goals linked for this person yet.")}
                    </p>
                  ) : (
                    <ul className="mt-3 space-y-2">
                      {cms.goals.slice(0, 12).map((g) => (
                        <li
                          key={g.id}
                          className="rounded-sm border border-line bg-surface px-3 py-2 text-sm"
                        >
                          <p className="font-medium text-ink">{g.title}</p>
                          <p className="text-xs text-ink-muted">
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
                </section>
              ) : null}
            </SheetBody>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function MetricRow({
  metric,
  isAdmin,
  onOpen,
  onAck,
}: {
  metric: ScoredKpi;
  isAdmin: boolean;
  onOpen: () => void;
  onAck?: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <li className="rounded-sm border border-line">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full min-w-0 items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-surface-2"
      >
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink">{metric.title}</p>
          <p className="mt-0.5 text-xs text-ink-muted">
            {t("Target")} {formatKpiValue(metric.targetValue, metric.unit)} {t("· Result")}{" "}
            {formatKpiValue(metric.actualValue, metric.unit)} ·{" "}
            {formatPercent(metric.achievementPercent, 0)} {t("of target")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <KpiStatusBadge status={metric.status} />
          <span
            className={cn(
              "text-[10px]",
              metric.acknowledgedAt || metric.incomplete
                ? "text-ink-muted"
                : "text-warn",
            )}
          >
            {metric.incomplete
              ? t("No result")
              : metric.acknowledgedAt
                ? t("Acked")
                : isAdmin
                  ? t("Waiting ack")
                  : t("Needs ack")}
          </span>
        </div>
      </button>
      {onAck ? (
        <div className="border-t px-3 py-2">
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={async (e) => {
              e.stopPropagation();
              setBusy(true);
              try {
                await onAck();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "…" : t("Got it")}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
