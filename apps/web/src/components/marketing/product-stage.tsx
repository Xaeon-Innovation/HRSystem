"use client";

import { MapPin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/provider";

const ROSTER = [
  {
    name: "Sara Al Mazrouei",
    role: "Field supervisor",
    time: "07:58",
    status: "Clocked in" as const,
  },
  {
    name: "James Okonkwo",
    role: "Technician",
    time: "08:02",
    status: "Clocked in" as const,
  },
  {
    name: "Layla Hassan",
    role: "Site lead",
    time: "08:11",
    status: "Clocked in" as const,
  },
  {
    name: "Omar Farid",
    role: "Driver",
    time: "-",
    status: "Off shift" as const,
  },
] as const;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

function FloatCard({
  children,
  className,
  reduce,
  delay = 0,
  floatClass,
}: {
  children: React.ReactNode;
  className?: string;
  reduce: boolean | null;
  delay?: number;
  /** CSS float animation class; omitted when reduced motion. */
  floatClass?: string;
}) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={cn(
        "rounded-lg border border-line bg-surface p-3 shadow-sm",
        !reduce && floatClass,
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

/** Product-frame preview for the hero with floating live cards. */
export function ProductStage({
  className,
  compact = false,
}: {
  className?: string;
  /** Auth side panel: main mock only, no float overlays. */
  compact?: boolean;
}) {
  const t = useT();
  const reduce = useReducedMotion();

  return (
    <div
      className={cn(
        "relative mx-auto w-full max-w-xl lg:max-w-none",
        className,
      )}
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.32,
          delay: 0.08,
          ease: [0.21, 0.47, 0.32, 0.98],
        }}
        className="overflow-hidden rounded-lg border border-line bg-surface shadow-sm"
      >
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
          <div className="ms-2 flex-1 truncate rounded-md bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
            elevora.xaeons.com/app
          </div>
        </div>

        <div className="border-b border-border/50 px-4 py-2.5">
          <div className="flex items-center justify-between gap-3">
            <div>
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
        </div>

        <ul className="divide-y divide-border/50">
          {ROSTER.map((person) => {
            const on = person.status === "Clocked in";
            return (
              <li
                key={person.name}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {initials(person.name)}
                  <span
                    className={cn(
                      "absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                      on ? "bg-emerald-500" : "bg-muted-foreground/40",
                    )}
                  />
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
                    {t(person.status)}
                  </p>
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {person.time === "-" ? "-" : person.time}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </motion.div>

      {!compact ? (
      /* Desktop floating overlays — CSS float, one ping only */
      <div className="pointer-events-none absolute inset-0 hidden lg:block">
        <FloatCard
          reduce={reduce}
          delay={0.18}
          floatClass="animate-marketing-float"
          className="absolute -start-4 top-8 w-[11.5rem]"
        >
          <div className="flex items-start gap-2">
            <span className="relative mt-0.5 flex h-2 w-2 shrink-0">
              {!reduce ? (
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              ) : null}
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-foreground">
                Sara Al Mazrouei
              </p>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="h-2.5 w-2.5 text-primary" aria-hidden />
                {t("GPS verified")} · 07:58
              </p>
            </div>
          </div>
        </FloatCard>

        <FloatCard
          reduce={reduce}
          delay={0.24}
          floatClass="animate-marketing-float-delayed"
          className="absolute -end-2 top-1/3 w-[9.5rem]"
        >
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("On shift")}
          </p>
          <p className="mt-0.5 font-display text-xl font-semibold tabular-nums text-foreground">
            3
          </p>
          <p className="text-[10px] text-muted-foreground">
            {t("Live field presence")}
          </p>
        </FloatCard>

        <FloatCard
          reduce={reduce}
          delay={0.3}
          floatClass="animate-marketing-float-slow"
          className="absolute -bottom-3 end-6 w-[11rem]"
        >
          <p className="text-[11px] font-medium text-foreground">
            {t("Leave · pending")}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Layla Hassan · {t("Annual")}
          </p>
          <p className="mt-1.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
            {t("KPI review · due")}
          </p>
        </FloatCard>
      </div>
      ) : null}

      {!compact ? (
      /* Mobile: chips under the mock, no overlap */
      <div className="mt-3 flex flex-wrap gap-2 lg:hidden">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm dark:border-white/10">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {t("GPS verified")} · 07:58
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm dark:border-white/10">
          3 {t("On shift")}
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card px-2.5 py-1.5 text-[11px] font-medium text-foreground shadow-sm dark:border-white/10">
          {t("Leave · pending")}
        </div>
      </div>
      ) : null}
    </div>
  );
}
