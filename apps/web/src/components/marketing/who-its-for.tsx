"use client";

import { HardHat, Users, Building2 } from "lucide-react";
import { MarketingSection } from "@/components/marketing/section";
import { Reveal } from "@/components/marketing/reveal";
import { useLocale, useT } from "@/i18n/provider";

const AUDIENCES = [
  {
    title: "Field operations",
    body: "See who’s on shift, where they are, and when GPS clock-in happened — without calling around.",
    icon: HardHat,
  },
  {
    title: "HR & people ops",
    body: "Leave, KPIs, hiring, and compensation stay next to attendance, so HR works from one source of truth.",
    icon: Users,
  },
  {
    title: "Site supervisors",
    body: "Live presence and mobile-first tools that stay useful on a phone at the job site.",
    icon: Building2,
  },
] as const;

export function WhoItsFor() {
  const t = useT();
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <MarketingSection compact id="who">
      <Reveal>
        <div className="max-w-2xl" dir={isAr ? "rtl" : undefined}>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {t("Made for outdoor and ops teams")}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {t("Who Elevora is built for")}
          </h2>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
        {AUDIENCES.map((item, i) => {
          const Icon = item.icon;
          return (
            <Reveal key={item.title} delayMs={i * 60}>
              <article
                className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 sm:p-6"
                dir={isAr ? "rtl" : undefined}
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
                  {t(item.title)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
                  {t(item.body)}
                </p>
              </article>
            </Reveal>
          );
        })}
      </div>
    </MarketingSection>
  );
}
