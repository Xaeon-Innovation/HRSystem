"use client";

import Link from "next/link";
import { ArrowRight, Check, Languages, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroMark, HeroOrbit, HeroOrbitRow } from "@/components/marketing/hero-orbit";
import { useLocale, useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const REPLACED = ["Spreadsheets", "WhatsApp groups", "Paper timesheets"];

export function MarketingHero() {
  const t = useT();
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <section className="relative mt-6 overflow-hidden rounded-[28px] border border-line bg-surface/60 px-5 py-12 sm:mt-8 sm:py-16 lg:flex lg:min-h-[700px] lg:items-center lg:py-20">
      {/* Dot grid that fades out toward the edges, like a desk the cards sit on. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(hsl(var(--line-strong)) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          maskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 70% at 50% 45%, black 40%, transparent 100%)",
        }}
      />

      <HeroOrbit />

      <div
        className="relative z-10 mx-auto w-full max-w-[520px] text-center xl:max-w-[600px]"
        dir={isAr ? "rtl" : undefined}
      >
        <HeroMark />

        <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1.5 pe-2.5 ps-1.5 text-xs font-medium text-ink">
          <span className="inline-flex h-5 items-center rounded-full bg-ink px-2 text-[10.5px] font-semibold text-primary-foreground">
            {t("New")}
          </span>
          {t("Integrations: CMS Goals and HubSpot")}
          <ArrowRight
            className={cn("h-3.5 w-3.5 text-ink-muted", isAr && "-scale-x-100")}
          />
        </span>

        <h1 className="mt-5 text-[clamp(38px,4.4vw,64px)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink">
          {t("Every operation.")}
          <span className="block text-ink-muted">
            {t("All in")}{" "}
            <em className="not-italic rounded-[0.18em] bg-accent px-[0.18em] text-accent-ink">
              {t("one place.")}
            </em>
          </span>
        </h1>

        <p className="mx-auto mt-4 max-w-[30rem] text-[15px] font-medium leading-snug text-ink-2 sm:text-[17px]">
          {t("The guiding star for your people: direction, alignment, and growth.")}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {REPLACED.map((label) => (
            <span
              key={label}
              className="rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink-muted line-through decoration-ink-muted/70"
            >
              {t(label)}
            </span>
          ))}
        </div>

        <p className="mx-auto mt-4 max-w-[34rem] text-[15px] leading-relaxed text-ink-2 sm:text-base">
          {t(
            "Still juggling spreadsheets, WhatsApp groups and paper timesheets? Polara replaces all of them: clock-in, live maps, shifts, tasks, leave, KPIs, hiring and payroll.",
          )}
        </p>

        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
          <Button asChild size="lg" className="h-12 w-full px-7 text-base sm:w-auto">
            <Link href="/signup">{t("Start 14-day free trial")}</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 w-full px-7 text-base sm:w-auto"
          >
            <Link href="/demo">{t("Book a demo")}</Link>
          </Button>
        </div>

        <div className="mt-5 flex flex-col items-center gap-2.5 text-sm text-ink-muted sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-4">
          <span className="inline-flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-accent-strong" strokeWidth={2.5} />
            {t("No card needed")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Languages className="h-3.5 w-3.5 text-accent-strong" />
            {t("English and Arabic")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <WifiOff className="h-3.5 w-3.5 text-accent-strong" />
            {t("Works offline")}
          </span>
        </div>

        <HeroOrbitRow />
      </div>
    </section>
  );
}
