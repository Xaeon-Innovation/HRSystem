"use client";

import Link from "next/link";
import { t } from "@/i18n";

export function MarketingFooter() {
  return (
    <footer className="mt-10 border-t border-line py-8 sm:py-9">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-ink text-primary-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 19V5h12M5 12h9M5 19h14"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[15px] font-bold tracking-[0.04em] text-ink">
            ELEVORA
          </span>
        </Link>
        <div className="flex flex-wrap gap-x-[18px] gap-y-2 text-[12.5px] text-ink-muted">
          <Link href="/pricing" className="hover:text-ink">
            {t("Pricing")}
          </Link>
          <Link href="/demo" className="hover:text-ink">
            {t("Book a demo")}
          </Link>
          <Link href="/privacy" className="hover:text-ink">
            {t("Privacy")}
          </Link>
          <Link href="/terms" className="hover:text-ink">
            {t("Terms")}
          </Link>
        </div>
        <p className="text-[12.5px] text-ink-muted">© 2026 Xaeon Software Solutions</p>
      </div>
    </footer>
  );
}
