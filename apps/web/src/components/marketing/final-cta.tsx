"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLocale, useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const STAIR = [
  0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1,
];

export function FinalCta() {
  const t = useT();
  const locale = useLocale();
  const isAr = locale === "ar";

  return (
    <section className="py-10 sm:py-14">
      <div
        className="relative overflow-hidden rounded-xl bg-ink px-6 py-11 text-primary-foreground sm:px-11 sm:py-12"
        dir={isAr ? "rtl" : undefined}
      >
        <h2 className="relative z-10 max-w-xl text-[clamp(28px,3.5vw,34px)] font-semibold leading-[1.1] tracking-[-0.03em]">
          {t("Try Elevora free for 14 days.")}
        </h2>
        <p className="relative z-10 mt-3 max-w-md text-sm text-primary-foreground/70 sm:text-[15px]">
          {t(
            "Every module unlocked during the trial. Invite your team in minutes.",
          )}
        </p>
        <div className="relative z-10 mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            asChild
            size="lg"
            variant="accent"
            className="h-12 w-full px-7 text-base sm:w-auto"
          >
            <Link href="/signup">{t("Start free trial")}</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 w-full border-primary-foreground/30 bg-transparent px-7 text-base text-primary-foreground hover:bg-primary-foreground/10 sm:w-auto"
          >
            <Link href="/demo">{t("Book a demo")}</Link>
          </Button>
        </div>

        <div
          className={cn(
            "pointer-events-none absolute bottom-0 end-0 grid w-[120px] grid-cols-4 gap-1 p-4 opacity-80 sm:w-[160px]",
          )}
          aria-hidden
        >
          {STAIR.map((on, i) => (
            <span
              key={i}
              className={cn(
                "aspect-square rounded-[3px]",
                on ? (i % 3 ? "hatch" : "hatch-soft") : "bg-transparent",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
