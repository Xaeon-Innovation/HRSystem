"use client";

import {
  CalendarDays,
  Clock,
  Gauge,
  MapPin,
  UserPlus,
  Wallet,
} from "lucide-react";
import { MarketingSection } from "@/components/marketing/section";
import { Reveal } from "@/components/marketing/reveal";
import { useT } from "@/i18n/provider";

const MODULES = [
  { label: "Clock-in", icon: Clock },
  { label: "Live map", icon: MapPin },
  { label: "KPIs", icon: Gauge },
  { label: "Leave", icon: CalendarDays },
  { label: "Hiring", icon: UserPlus },
  { label: "Compensation", icon: Wallet },
] as const;

export function ModuleStrip() {
  const t = useT();

  return (
    <MarketingSection compact>
      <Reveal>
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("From the field to people ops")}
        </p>
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {MODULES.map(({ label, icon: Icon }) => (
            <li
              key={label}
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border/70 bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm dark:border-white/10"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </span>
              {t(label)}
            </li>
          ))}
        </ul>
      </Reveal>
    </MarketingSection>
  );
}
