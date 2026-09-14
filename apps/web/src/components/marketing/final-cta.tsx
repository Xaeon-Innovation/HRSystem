"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketingSection } from "@/components/marketing/section";
import { Reveal } from "@/components/marketing/reveal";
import { useLocale, useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export function FinalCta() {
  const t = useT();
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <MarketingSection compact>
      <Reveal>
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-3xl border border-primary/30 bg-card/90 px-5 py-10 text-center shadow-[0_18px_50px_-20px_hsl(199_85%_32%/0.45)] sm:px-12 sm:py-14 dark:border-primary/35 dark:bg-card/60 dark:shadow-[0_18px_50px_-18px_hsl(192_70%_46%/0.4)]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(199_85%_32%/0.18),_transparent_58%)] dark:bg-[radial-gradient(ellipse_at_top,_hsl(192_70%_50%/0.28),_transparent_60%)]"
          />
          <div className="relative" dir={isAr ? "rtl" : undefined}>
            <p className="inline-flex max-w-full flex-wrap items-center justify-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {t("14-day free trial · No credit card required")}
            </p>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("Ready to run your field team on Elevora?")}
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
              {t("Start a free trial in minutes, no credit card required.")}
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 w-full px-8 text-base shadow-lg shadow-primary/35 hover:shadow-primary/50 sm:w-auto"
              >
                <Link href="/signup">
                  {t("Start free trial")}
                  <ArrowRight
                    className={cn("ms-1 h-4 w-4", isAr && "-scale-x-100")}
                  />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 w-full border-primary/25 bg-background/70 sm:w-auto"
              >
                <Link href="/pricing">{t("See pricing")}</Link>
              </Button>
            </div>
          </div>
        </div>
      </Reveal>
    </MarketingSection>
  );
}
