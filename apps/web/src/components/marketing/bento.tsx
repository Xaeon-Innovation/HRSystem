"use client";

import { CloudOff } from "lucide-react";
import {
  SegmentBar,
  SegmentGauge,
  StackedBarChart,
  TipCard,
} from "@/components/elevora";
import { useT } from "@/i18n/provider";

const ATTENDANCE = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
  (l, i) => ({
    label: l,
    values: [
      [41, 43, 39, 44, 40, 33, 12][i],
      [4, 3, 6, 2, 5, 5, 1][i],
      [3, 5, 4, 6, 2, 0, 0][i],
    ],
  }),
);

export function ProductBento() {
  const t = useT();

  return (
    <section className="py-10 sm:py-12">
      <div className="max-w-2xl">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
          {t("Product")}
        </p>
        <h2 className="mt-2 text-[clamp(28px,3.5vw,40px)] font-semibold tracking-[-0.03em] text-ink">
          {t("Everything a people team touches, in one place.")}
        </h2>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <div className="rounded-lg border border-line bg-surface p-5 sm:col-span-2 lg:col-span-4 lg:row-span-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-ink">
                {t("Attendance you can trust")}
              </h3>
              <p className="mt-1 text-sm text-ink-muted">
                {t(
                  "Server timestamps, geofences, breaks and overtime prompts.",
                )}
              </p>
            </div>
            <span className="rounded-full bg-accent-tint px-2.5 py-0.5 text-2xs font-semibold text-accent-ink">
              {t("Field ops")}
            </span>
          </div>
          <div className="mt-4">
            <StackedBarChart
              seriesLabels={[t("On time"), t("Late"), t("OT")]}
              days={ATTENDANCE}
              activeIndex={3}
              max={60}
              min={0}
            />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 lg:col-span-2">
          <h3 className="text-[15px] font-semibold text-ink">
            {t("KPI scorecards")}
          </h3>
          <p className="mt-1 text-[11.5px] text-ink-muted">
            {t("Weighted roll-ups, never blended with CMS Goals.")}
          </p>
          <div className="mt-3 flex justify-center">
            <SegmentGauge percent={84} label="84" sub={t("overall score")} />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 lg:col-span-2">
          <h3 className="text-[15px] font-semibold text-ink">
            {t("Offline first")}
          </h3>
          <p className="mt-1 text-[11.5px] text-ink-muted">
            {t("Clock events queue and sync later.")}
          </p>
          <div className="mt-3 flex items-center gap-2.5 rounded-sm border border-line bg-surface-2 px-3 py-2.5">
            <CloudOff className="h-4 w-4 shrink-0 text-ink-muted" />
            <p className="text-sm text-ink">
              <span className="font-semibold">2 {t("events")}</span>{" "}
              <span className="text-ink-muted">{t("waiting to sync")}</span>
            </p>
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <TipCard
            title={t("Hiring to roster")}
            copy={t(
              "Pipeline, interviews, offers, then one click to add the hire as an employee.",
            )}
            className="h-full p-5"
          />
        </div>

        <div className="rounded-lg border border-line bg-surface p-5 sm:col-span-2 lg:col-span-3">
          <h3 className="text-[15px] font-semibold text-ink">
            {t("Compensation with approvals")}
          </h3>
          <div className="mt-3">
            <SegmentBar
              segments={[
                { value: 68, tone: "accent", label: t("Base") },
                { value: 14, tone: "yellow", label: t("Allowances") },
                { value: 9, tone: "warn", label: t("Variable") },
                { value: 9, tone: "idle", label: t("Other") },
              ]}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <i className="hatch inline-block h-2.5 w-2.5 rounded-[2px]" />
              {t("Base")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="hatch-yellow inline-block h-2.5 w-2.5 rounded-[2px]" />
              {t("Allowances")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <i className="hatch-warn inline-block h-2.5 w-2.5 rounded-[2px]" />
              {t("Variable")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
