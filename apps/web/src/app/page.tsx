"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { t } from "@/i18n";

export default function HomePage() {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-6 px-6 py-10">
      <div className="absolute right-4 top-4 flex flex-col items-end gap-2 sm:right-6 sm:top-6">
        <LanguageToggle showLabels={false} />
        <ThemeToggle />
      </div>
      <div className="space-y-6 rounded-2xl border border-white/40 bg-card p-6 shadow-[0_8px_32px_hsl(var(--foreground)/0.06)] dark:border-white/10 sm:p-8">
        <div className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            {t("Creative Multi Solutions")}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {t("HR Track")}
          </h1>
          <p className="text-muted-foreground">
            {t(
              "Mobile-first workforce clock-in, KPIs, and live field location for outdoor teams.",
            )}
          </p>
        </div>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">{t("Sign in")}</Link>
        </Button>
      </div>
    </div>
  );
}
