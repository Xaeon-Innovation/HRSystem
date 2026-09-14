"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { ProductStage } from "@/components/marketing/product-stage";
import { MarketingSection } from "@/components/marketing/section";
import { useT } from "@/i18n/provider";

const CLAIMS = [
  "GPS-backed clock-in",
  "Live field presence",
  "KPIs & people ops",
] as const;

export function MarketingHero() {
  const t = useT();
  const reduce = useReducedMotion();

  return (
    <MarketingSection
      className="relative overflow-hidden !min-h-[calc(100svh-3.5rem)]"
      contained={false}
    >
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:gap-12">
        <div className="min-w-0">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="max-w-xl font-display text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]"
          >
            {t("See every field team. Run people ops from one place.")}
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.06 }}
            className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg"
          >
            {t(
              "GPS clock-in, live location, KPIs, leave, hiring, and compensation, built for outdoor and ops teams.",
            )}
          </motion.p>

          <motion.ul
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="mt-5 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-6 sm:gap-y-1"
          >
            {CLAIMS.map((claim) => (
              <li
                key={claim}
                className="text-sm font-medium tracking-tight text-foreground/80"
              >
                {t(claim)}
              </li>
            ))}
          </motion.ul>

          <motion.div
            initial={reduce ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.14 }}
            className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            <Button
              asChild
              size="lg"
              className="h-12 w-full px-7 text-base shadow-lg shadow-primary/35 hover:shadow-primary/50 sm:w-auto"
            >
              <Link href="/signup">
                {t("Start free trial")}
                <ArrowRight className="ms-2 h-4 w-4" />
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
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28 }}
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
