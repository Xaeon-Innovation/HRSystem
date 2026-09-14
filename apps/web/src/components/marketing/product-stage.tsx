"use client";

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

/** Static product-frame preview for the hero, roster, not a fake map. */
export function ProductStage({ className }: { className?: string }) {
  const t = useT();
  const reduce = useReducedMotion();

  return (
    <div className={cn("relative mx-auto w-full max-w-xl lg:max-w-none", className)}>
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.12, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm dark:border-white/10"
      >
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
          <span className="h-2 w-2 rounded-full bg-border" />
          <div className="ms-2 flex-1 truncate rounded-md bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground">
            app.elevora.ae
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
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground">
                  {initials(person.name)}
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
    </div>
  );
}
