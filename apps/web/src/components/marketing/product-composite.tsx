"use client";

import { MapPin } from "lucide-react";
import { StackedBarChart } from "@/components/elevora";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/provider";

const WEEK = [
  { label: "S", values: [41, 4] },
  { label: "M", values: [43, 3] },
  { label: "T", values: [39, 6] },
  { label: "W", values: [44, 2] },
  { label: "T", values: [40, 5] },
  { label: "F", values: [33, 5] },
  { label: "S", values: [12, 1] },
];

/** Decorative marketing composite from the redesign prototype (static demo art). */
export function ProductComposite({ className }: { className?: string }) {
  const t = useT();

  return (
    <div className={cn("relative px-2 pb-10 pt-8 sm:px-4 sm:pb-12 sm:pt-14", className)}>
      <div className="relative rounded-lg border border-line bg-surface p-[18px] shadow-pop">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-stat font-semibold tracking-tight text-ink tabular">
              38
              <span className="ms-1 text-lg font-medium text-ink-muted">/ 52</span>
            </p>
            <p className="text-[11.5px] text-ink-muted">{t("Clocked in now")}</p>
          </div>
          <span className="inline-flex h-7 items-center rounded-full border border-line-strong bg-surface px-2.5 text-2xs font-medium text-ink-2">
            {t("This week")}
          </span>
        </div>
        <div className="mt-3">
          <StackedBarChart
            seriesLabels={[t("On time"), t("Late")]}
            days={WEEK}
            activeIndex={3}
            max={60}
            min={0}
            className="min-h-[180px]"
          />
        </div>
      </div>

      <div className="absolute -end-2 bottom-0 z-10 w-[min(230px,70%)] rounded-lg border border-line bg-surface p-3.5 shadow-pop sm:-end-4 sm:bottom-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-ink">{t("Leave request")}</p>
          <span className="rounded-full bg-warn/15 px-2 py-0.5 text-[10.5px] font-semibold text-warn">
            {t("Pending")}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-surface-2 text-2xs font-semibold text-ink">
            YN
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">Youssef Nabil</p>
            <p className="truncate text-[11px] text-ink-muted">
              {t("Annual")} · 2 {t("days")}
            </p>
          </div>
        </div>
        <div className="mt-2.5 flex gap-1.5">
          <span className="flex h-8 flex-1 items-center justify-center rounded-sm border border-line-strong text-2xs font-medium text-ink">
            {t("Reject")}
          </span>
          <span className="flex h-8 flex-1 items-center justify-center rounded-sm bg-ink text-2xs font-medium text-primary-foreground">
            {t("Approve")}
          </span>
        </div>
      </div>

      <div className="absolute -start-1 top-0 z-10 hidden items-center gap-2.5 rounded-lg border border-line bg-surface px-3 py-2.5 shadow-pop sm:-start-3 sm:top-2 md:flex">
        <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-accent-tint text-accent-strong">
          <MapPin className="h-4 w-4" strokeWidth={1.7} />
        </span>
        <div>
          <p className="text-xs font-semibold text-ink">{t("31 on the map")}</p>
          <p className="text-[11px] text-ink-muted">{t("Live · WebSocket")}</p>
        </div>
      </div>
    </div>
  );
}
