"use client";

import Link from "next/link";
import { ArrowRight, Gauge, MapPin, Radio } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ProductStage } from "@/components/marketing/product-stage";
import { MarketingSection } from "@/components/marketing/section";
import { useLocale, useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const CLAIMS = [
  { label: "GPS-backed clock-in", icon: MapPin },
  { label: "Live field presence", icon: Radio },
  { label: "KPIs & people ops", icon: Gauge },
] as const;

const enter = (reduce: boolean | null, delay = 0) =>
  reduce
    ? ({ initial: false as const })
    : ({
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28, delay, ease: [0.21, 0.47, 0.32, 0.98] as const },
      });

export function MarketingHero() {
  const t = useT();
  const locale = useLocale();
  const isAr = locale === "ar";
  const reduce = useReducedMotion();

  return (
    <MarketingSection
      className="relative overflow-hidden !min-h-[calc(100svh-3.5rem)]"
      contained={false}
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="min-w-0" dir={isAr ? "rtl" : undefined}>
          <motion.div
            {...enter(reduce)}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
          >
            <span className="relative flex h-2 w-2">
              {!reduce ? (
                <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/60" />
              ) : null}
              <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            {t("Live field presence")}
          </motion.div>

          <motion.h1
            {...enter(reduce, 0.04)}
            className="max-w-xl font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]"
          >
            {t("See every field team. Run people ops from one place.")}
          </motion.h1>
          <motion.p
            {...enter(reduce, 0.06)}
            className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg"
          >
            {t(
              "GPS clock-in, live location, KPIs, leave, hiring, and compensation, built for outdoor and ops teams.",
            )}
          </motion.p>

          <motion.ul
            {...enter(reduce, 0.08)}
            className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2"
          >
            {CLAIMS.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex items-center gap-2 text-sm font-medium tracking-tight text-foreground/80"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
                {t(label)}
              </li>
            ))}
          </motion.ul>

          <motion.div
            {...enter(reduce, 0.1)}
            className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <Button
              asChild
              size="lg"
              className="h-12 w-full px-7 text-base shadow-lg shadow-primary/35 hover:shadow-primary/50 sm:w-auto"
            >
              <Link href="/signup">
                {t("Start free trial")}
                <ArrowRight
                  className={cn("ms-2 h-4 w-4", isAr && "-scale-x-100")}
                />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Link href="/pricing">{t("See pricing")}</Link>
            </Button>
          </motion.div>
          <motion.p
            {...enter(reduce, 0.14)}
            className="mt-3 text-sm text-muted-foreground"
          >
            {t("14-day free trial · No credit card required")}
          </motion.p>
        </div>

        <ProductStage />
      </div>
    </MarketingSection>
  );
}
