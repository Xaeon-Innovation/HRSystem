"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MarketingSection } from "@/components/marketing/section";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/provider";

type FeatureId =
  | "clock"
  | "presence"
  | "kpi"
  | "leave"
  | "hiring";

const FEATURES: {
  id: FeatureId;
  title: string;
  body: string;
}[] = [
  {
    id: "clock",
    title: "Mobile clock-in",
    body: "GPS-backed attendance from the phone, field or office.",
  },
  {
    id: "presence",
    title: "Live field presence",
    body: "Watch who’s clocked in and where they are, presence that updates while people work.",
  },
  {
    id: "kpi",
    title: "KPIs & scorecards",
    body: "Targets, results, and roll-ups without spreadsheet chaos.",
  },
  {
    id: "leave",
    title: "Leave management",
    body: "Policies, balances, requests, and calendars managers actually use.",
  },
  {
    id: "hiring",
    title: "Hiring & compensation",
    body: "Pipeline through offers, plus structures ready for payroll handoff.",
  },
];

function PreviewShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm dark:border-white/10">
      <div className="flex items-center gap-1.5 border-b border-border/50 bg-muted/30 px-3 py-2">
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
        <span className="h-1.5 w-1.5 rounded-full bg-border" />
      </div>
      <div className="p-3 sm:p-4">{children}</div>
    </div>
  );
}

function ClockPreview({
  t,
  reduce,
}: {
  t: (s: string) => string;
  reduce: boolean | null;
}) {
  return (
    <PreviewShell>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {t("Today")}
      </p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-foreground">
        08:12
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{t("Field site · Dubai")}</p>
      <motion.div
        className="mt-4 flex items-center justify-between rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground"
        animate={reduce ? undefined : { scale: [1, 1.02, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span>{t("Clocked in")}</span>
        <span className="text-xs opacity-90">GPS ✓</span>
      </motion.div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-emerald-500"
          initial={reduce ? { width: "62%" } : { width: "0%" }}
          animate={{ width: "62%" }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t("Shift progress")}
      </p>
    </PreviewShell>
  );
}

function PresencePreview({
  t,
  reduce,
}: {
  t: (s: string) => string;
  reduce: boolean | null;
}) {
  const rows = [
    { name: "Sara A.", status: "On shift", on: true },
    { name: "James O.", status: "Moving", on: true },
    { name: "Omar F.", status: "Off shift", on: false },
  ] as const;

  return (
    <PreviewShell>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">{t("Live")}</p>
        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
          12
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <motion.li
            key={row.name}
            className="flex items-center gap-2.5 rounded-lg border border-border/50 px-2.5 py-2"
            initial={reduce ? false : { opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.35 }}
          >
            <span
              className={cn(
                "relative h-2 w-2 shrink-0 rounded-full",
                row.on ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
            >
              {row.on && !reduce ? (
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
              ) : null}
            </span>
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
              {row.name}
            </span>
            <span
              className={cn(
                "text-[11px]",
                row.on
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              {t(row.status)}
            </span>
          </motion.li>
        ))}
      </ul>
    </PreviewShell>
  );
}

function KpiPreview({
  t,
  reduce,
}: {
  t: (s: string) => string;
  reduce: boolean | null;
}) {
  const bars = [
    { label: "Visits", value: 86 },
    { label: "SLA", value: 72 },
    { label: "CSAT", value: 94 },
  ] as const;

  return (
    <PreviewShell>
      <p className="text-sm font-semibold text-foreground">{t("Scorecard")}</p>
      <p className="text-xs text-muted-foreground">{t("This week")}</p>
      <ul className="mt-4 space-y-3">
        {bars.map((bar, i) => (
          <li key={bar.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">{bar.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {bar.value}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={reduce ? { width: `${bar.value}%` } : { width: "0%" }}
                animate={{ width: `${bar.value}%` }}
                transition={{
                  delay: 0.1 + i * 0.1,
                  duration: 0.7,
                  ease: "easeOut",
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </PreviewShell>
  );
}

function LeavePreview({
  t,
  reduce,
}: {
  t: (s: string) => string;
  reduce: boolean | null;
}) {
  const rows = [
    { name: "Layla H.", type: "Annual", status: "Pending" },
    { name: "Nina P.", type: "Sick", status: "Approved" },
  ] as const;

  return (
    <PreviewShell>
      <p className="text-sm font-semibold text-foreground">{t("Leave")}</p>
      <ul className="mt-3 space-y-2">
        {rows.map((row, i) => (
          <motion.li
            key={row.name}
            className="rounded-lg border border-border/50 px-2.5 py-2"
            initial={reduce ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.35 }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground">
                {row.name}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  row.status === "Pending"
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                )}
              >
                {t(row.status)}
              </span>
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {t(row.type)} · 12–14 Mar
            </p>
          </motion.li>
        ))}
      </ul>
    </PreviewShell>
  );
}

function HiringPreview({
  t,
  reduce,
}: {
  t: (s: string) => string;
  reduce: boolean | null;
}) {
  const stages = [
    { label: "Screen", n: 8 },
    { label: "Interview", n: 3 },
    { label: "Offer", n: 1 },
  ] as const;

  return (
    <PreviewShell>
      <p className="text-sm font-semibold text-foreground">{t("Pipeline")}</p>
      <p className="text-xs text-muted-foreground">{t("Field technician")}</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {stages.map((stage, i) => (
          <motion.div
            key={stage.label}
            className="rounded-lg border border-border/50 bg-muted/30 px-2 py-3 text-center"
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.35 }}
          >
            <p className="font-display text-xl font-semibold tabular-nums text-foreground">
              {stage.n}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {t(stage.label)}
            </p>
          </motion.div>
        ))}
      </div>
      <motion.div
        className="mt-3 rounded-lg border border-primary/25 bg-primary/10 px-2.5 py-2 text-xs font-medium text-foreground"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
      >
        {t("Offer ready · AED 9,500")}
      </motion.div>
    </PreviewShell>
  );
}

function FeaturePreview({
  id,
  t,
  reduce,
}: {
  id: FeatureId;
  t: (s: string) => string;
  reduce: boolean | null;
}) {
  switch (id) {
    case "clock":
      return <ClockPreview t={t} reduce={reduce} />;
    case "presence":
      return <PresencePreview t={t} reduce={reduce} />;
    case "kpi":
      return <KpiPreview t={t} reduce={reduce} />;
    case "leave":
      return <LeavePreview t={t} reduce={reduce} />;
    case "hiring":
      return <HiringPreview t={t} reduce={reduce} />;
  }
}

export function ProductBento() {
  const t = useT();
  const reduce = useReducedMotion();
  const [active, setActive] = useState<FeatureId>("clock");

  return (
    <MarketingSection id="features">
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("One system for the field and the office")}
        </h2>
        <p className="mt-4 text-muted-foreground">
          {t(
            "Attendance, live presence, and people ops in one mobile-first product, not a pile of disconnected tools.",
          )}
        </p>
      </div>

      <div className="mt-12 grid items-start gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14">
        <ul className="min-w-0">
          {FEATURES.map((feature) => {
            const isActive = active === feature.id;
            return (
              <li key={feature.id} className="border-t border-border/60">
                <button
                  type="button"
                  className="w-full py-5 text-start outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring"
                  onMouseEnter={() => setActive(feature.id)}
                  onFocus={() => setActive(feature.id)}
                  onClick={() => setActive(feature.id)}
                  aria-pressed={isActive}
                >
                  <motion.h3
                    className={cn(
                      "font-semibold tracking-tight text-foreground origin-left",
                      isActive ? "text-foreground" : "text-foreground/70",
                    )}
                    animate={{
                      scale: isActive ? 1.12 : 1,
                      opacity: isActive ? 1 : 0.72,
                    }}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 320, damping: 24 }
                    }
                  >
                    <span className="inline-block text-lg sm:text-xl">
                      {t(feature.title)}
                    </span>
                  </motion.h3>
                  <motion.p
                    className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base"
                    animate={{ opacity: isActive ? 1 : 0.55 }}
                    transition={{ duration: reduce ? 0 : 0.2 }}
                  >
                    {t(feature.body)}
                  </motion.p>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="relative min-w-0 lg:sticky lg:top-24">
          {/* Mobile: preview under list; desktop: beside */}
          <div className="mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={
                  reduce ? false : { opacity: 0, y: 12, scale: 0.98 }
                }
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.21, 0.47, 0.32, 0.98] }}
              >
                <FeaturePreview id={active} t={t} reduce={reduce} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </MarketingSection>
  );
}
