"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MapPin } from "lucide-react";
import { MarketingSection } from "@/components/marketing/section";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/provider";

const STEPS = [
  {
    id: "clock",
    n: "1",
    title: "Clock in from the phone",
    body: "Field and office teams start shifts with GPS-backed attendance in seconds.",
  },
  {
    id: "live",
    n: "2",
    title: "See who’s working live",
    body: "Managers open the live map and know who’s on shift, idle, or moving.",
  },
  {
    id: "ops",
    n: "3",
    title: "Run the rest of people ops",
    body: "KPIs, leave, hiring, and compensation stay in the same system, not another spreadsheet.",
  },
] as const;

type StepId = (typeof STEPS)[number]["id"];

const ROSTER = [
  {
    name: "Sara Al Mazrouei",
    role: "Field supervisor",
    time: "07:58",
    status: "Clocked in" as const,
    live: "On shift" as const,
  },
  {
    name: "James Okonkwo",
    role: "Technician",
    time: "08:02",
    status: "Clocked in" as const,
    live: "Moving" as const,
  },
  {
    name: "Layla Hassan",
    role: "Site lead",
    time: "08:11",
    status: "Clocked in" as const,
    live: "On shift" as const,
  },
  {
    name: "Omar Farid",
    role: "Driver",
    time: "-",
    status: "Off shift" as const,
    live: "Off shift" as const,
  },
] as const;

const AUTO_MS = 5000;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function PreviewChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm dark:border-white/10">
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <div className="ms-2 min-w-0 flex-1 truncate rounded-md bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
          app.elevora.ae
        </div>
      </div>
      {children}
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
    <div className="flex min-h-[20rem] items-center justify-center px-2 py-2 sm:min-h-[22rem]">
      <div className="w-full max-w-[16.5rem] overflow-hidden rounded-[1.75rem] border border-border/70 bg-card shadow-sm dark:border-white/10">
        <div className="flex justify-center bg-muted/30 py-2">
          <span className="h-1.5 w-14 rounded-full bg-border" />
        </div>
        <div className="px-4 pb-5 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("Today")}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-foreground">
            07:58
          </p>
          <p className="mt-1 text-sm font-medium text-foreground">
            Sara Al Mazrouei
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0 text-primary" />
            {t("Field site · Dubai")}
          </p>
          <motion.div
            className="mt-4 flex items-center justify-between rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground"
            animate={reduce ? undefined : { scale: [1, 1.02, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <span>{t("Clocked in")}</span>
            <span className="text-xs opacity-90">{t("GPS verified")}</span>
          </motion.div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-emerald-500"
              initial={reduce ? { width: "38%" } : { width: "0%" }}
              animate={{ width: "38%" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("Shift progress")}
          </p>
        </div>
      </div>
    </div>
  );
}

function LivePreview({
  t,
  reduce,
}: {
  t: (s: string) => string;
  reduce: boolean | null;
}) {
  return (
    <PreviewChrome>
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {t("Today’s team")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("3 clocked in · 1 off shift")}
          </p>
        </div>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
          {t("Live")}
        </span>
      </div>
      <ul className="divide-y divide-border/50">
        {ROSTER.map((person, i) => {
          const on = person.status === "Clocked in";
          return (
            <motion.li
              key={person.name}
              className="flex items-center gap-3 px-4 py-2.5"
              initial={reduce ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.06 * i, duration: 0.3 }}
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                {initials(person.name)}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                    on ? "bg-emerald-500" : "bg-muted-foreground/40",
                  )}
                >
                  {on && !reduce ? (
                    <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/70" />
                  ) : null}
                </span>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {person.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {t(person.role)}
                </p>
              </div>
              <div className="shrink-0 text-end">
                <p
                  className={cn(
                    "text-xs font-medium",
                    on
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-muted-foreground",
                  )}
                >
                  {t(person.live)}
                </p>
                <p className="text-[11px] tabular-nums text-muted-foreground">
                  {person.time}
                </p>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </PreviewChrome>
  );
}

function OpsPreview({
  t,
  reduce,
}: {
  t: (s: string) => string;
  reduce: boolean | null;
}) {
  return (
    <PreviewChrome>
      <div className="min-h-[20rem] space-y-3 p-4 sm:min-h-[22rem]">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {t("People ops")}
          </p>
          <p className="text-xs text-muted-foreground">{t("This week")}</p>
        </div>
        <motion.div
          className="rounded-lg border border-border/50 px-3 py-2.5"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-foreground">Layla Hassan</p>
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
              {t("Pending")}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {t("Leave")} · {t("Annual")} · 12–14 Mar
          </p>
        </motion.div>
        <motion.div
          className="rounded-lg border border-border/50 px-3 py-2.5"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-foreground">{t("Visits")}</span>
            <span className="tabular-nums text-muted-foreground">86%</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={reduce ? { width: "86%" } : { width: "0%" }}
              animate={{ width: "86%" }}
              transition={{ delay: 0.15, duration: 0.7, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Sara Al Mazrouei · {t("This week")}
          </p>
        </motion.div>
      </div>
    </PreviewChrome>
  );
}

function StepPreview({
  id,
  t,
  reduce,
}: {
  id: StepId;
  t: (s: string) => string;
  reduce: boolean | null;
}) {
  if (id === "clock") return <ClockPreview t={t} reduce={reduce} />;
  if (id === "live") return <LivePreview t={t} reduce={reduce} />;
  return <OpsPreview t={t} reduce={reduce} />;
}

export function HowItWorks() {
  const t = useT();
  const reduce = useReducedMotion();
  const [active, setActive] = useState<StepId>("clock");
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (reduce || paused) return;
    const id = window.setInterval(() => {
      setActive((current) => {
        const i = STEPS.findIndex((step) => step.id === current);
        return STEPS[(i + 1) % STEPS.length]!.id;
      });
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [reduce, paused]);

  const activeStep = STEPS.find((step) => step.id === active) ?? STEPS[0];

  return (
    <MarketingSection>
      <div className="max-w-2xl">
        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {t("From the field to the office in three steps")}
        </h2>
      </div>

      <div
        className="mt-10 grid items-start gap-8 lg:mt-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-12"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setPaused(false);
          }
        }}
      >
        <div className="min-w-0">
          <div
            role="tablist"
            aria-label={t("How it works")}
            className="grid grid-cols-3 gap-2 lg:hidden"
          >
            {STEPS.map((step) => {
              const isActive = step.id === active;
              return (
                <button
                  key={step.id}
                  type="button"
                  role="tab"
                  id={`how-tab-${step.id}`}
                  aria-selected={isActive}
                  aria-controls="how-preview"
                  className={cn(
                    "relative min-h-11 overflow-hidden rounded-xl border px-2 py-2 text-start",
                    isActive
                      ? "border-primary/40 bg-primary/10"
                      : "border-border/70 bg-card/60",
                  )}
                  onClick={() => setActive(step.id)}
                >
                  <span className="text-xs font-semibold tabular-nums text-primary">
                    {step.n}
                  </span>
                  <span className="mt-0.5 block text-[11px] font-medium leading-tight text-foreground">
                    {t(step.title)}
                  </span>
                  {isActive && !reduce && !paused ? (
                    <motion.span
                      key={`${step.id}-bar`}
                      className="absolute inset-x-0 bottom-0 h-0.5 origin-start bg-primary"
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: AUTO_MS / 1000, ease: "linear" }}
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground lg:hidden">
            {t(activeStep.body)}
          </p>

          <ol
            role="tablist"
            aria-label={t("How it works")}
            className="hidden lg:block"
          >
            {STEPS.map((step) => {
              const isActive = step.id === active;
              return (
                <li key={step.id} className="border-t border-border/60">
                  <button
                    type="button"
                    role="tab"
                    id={`how-tab-lg-${step.id}`}
                    aria-selected={isActive}
                    aria-controls="how-preview"
                    className="relative w-full py-5 text-start outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setActive(step.id)}
                    onMouseEnter={() => setActive(step.id)}
                  >
                    <span className="text-xs font-semibold tabular-nums text-primary">
                      {t("Step {n}", { n: step.n })}
                    </span>
                    <h3
                      className={cn(
                        "mt-1 text-xl font-semibold tracking-tight",
                        isActive ? "text-foreground" : "text-foreground/70",
                      )}
                    >
                      {t(step.title)}
                    </h3>
                    <p
                      className={cn(
                        "mt-2 max-w-md text-sm leading-relaxed sm:text-base",
                        isActive
                          ? "text-muted-foreground"
                          : "text-muted-foreground/70",
                      )}
                    >
                      {t(step.body)}
                    </p>
                    {isActive && !reduce && !paused ? (
                      <motion.span
                        key={`${step.id}-bar-lg`}
                        className="absolute inset-x-0 bottom-0 h-0.5 origin-start bg-primary"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{
                          duration: AUTO_MS / 1000,
                          ease: "linear",
                        }}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div
          id="how-preview"
          role="tabpanel"
          aria-label={t("Product preview")}
          className="min-w-0"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.21, 0.47, 0.32, 0.98] }}
            >
              <StepPreview id={active} t={t} reduce={reduce} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MarketingSection>
  );
}
