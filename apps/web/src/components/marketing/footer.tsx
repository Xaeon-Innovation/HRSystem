"use client";

import Link from "next/link";
import { useLocale, useT } from "@/i18n/provider";
import { cn } from "@/lib/utils";

const XAEON_URL = "https://xaeons.com";

function XaeonProductCredit({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const logoBox = cn(
    "relative inline-block shrink-0",
    compact ? "h-3 w-8" : "h-5 w-14",
  );
  const logoClass = "absolute inset-0 h-full w-full object-contain";
  const logo = (
    <span className={logoBox}>
      <img
        src="/logo.png"
        alt=""
        className={cn(logoClass, "dark:hidden")}
      />
      <img
        src="/devlogo.png"
        alt=""
        className={cn(logoClass, "hidden dark:block")}
      />
    </span>
  );

  return (
    <a
      href={XAEON_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("A Xaeon product")}
      className={cn(
        "inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground",
        compact ? "text-xs" : "min-h-10 text-sm",
      )}
    >
      {locale === "ar" ? (
        <>
          <span aria-hidden="true">{t("A product from")}</span>
          {logo}
        </>
      ) : (
        <>
          <span aria-hidden="true">{t("A")}</span>
          {logo}
          <span aria-hidden="true">{t("product")}</span>
        </>
      )}
    </a>
  );
}

export function MarketingFooter() {
  const t = useT();
  return (
    <footer className="border-t border-border/60 bg-background/70 pb-20 md:pb-0">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <p className="text-lg font-semibold tracking-tight">Elevora</p>
          <XaeonProductCredit />
          <a
            href="mailto:info@xaeons.com"
            className="block text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            info@xaeons.com
          </a>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
          <Link href="/pricing" className="text-muted-foreground hover:text-foreground">
            {t("Pricing")}
          </Link>
          <Link href="/signup" className="text-muted-foreground hover:text-foreground">
            {t("Start free trial")}
          </Link>
          <Link href="/demo" className="text-muted-foreground hover:text-foreground">
            {t("Request demo")}
          </Link>
          <Link href="/terms" className="text-muted-foreground hover:text-foreground">
            {t("Terms of Service")}
          </Link>
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
            {t("Privacy Policy")}
          </Link>
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            {t("Sign in")}
          </Link>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-1 border-t border-border/40 px-4 py-4 text-xs text-muted-foreground sm:px-6">
        <span>© {new Date().getFullYear()} Elevora ·</span>
        <XaeonProductCredit compact />
      </div>
    </footer>
  );
}
