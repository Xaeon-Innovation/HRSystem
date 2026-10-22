"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/elevora";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#features", label: "Product" },
  { href: "/pricing", label: "Pricing" },
  { href: "/demo", label: "Book a demo" },
] as const;

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-frame/90 backdrop-blur-md">
      <div className="mx-auto flex h-[58px] max-w-[1180px] items-center gap-3 px-4 sm:gap-6 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
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

        <nav className="ms-2 hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-[8px] px-3 py-2 text-[13px] font-medium text-ink-2 transition-colors hover:bg-surface hover:text-ink",
                pathname === item.href && "bg-surface text-ink",
              )}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-2">
          <div className="hidden items-center gap-1.5 sm:flex">
            <ThemeToggle />
            <LanguageToggle showLabels={false} />
          </div>

          <Link
            href="/login"
            className="hidden text-[13px] font-medium text-ink-2 transition-colors hover:text-ink md:inline"
          >
            {t("Log in")}
          </Link>

          <Button asChild size="sm" className="hidden md:inline-flex">
            <Link href="/signup">{t("Start free trial")}</Link>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="md:hidden"
            aria-expanded={open}
            aria-label={open ? t("Close menu") : t("Open menu")}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-line bg-frame px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2 hover:bg-surface"
                onClick={() => setOpen(false)}
              >
                {t(item.label)}
              </Link>
            ))}
            <div className="my-2 flex items-center gap-2">
              <ThemeToggle />
              <LanguageToggle showLabels={false} />
            </div>
            <Link
              href="/login"
              className="rounded-sm px-3 py-2.5 text-sm font-medium text-ink-2"
              onClick={() => setOpen(false)}
            >
              {t("Log in")}
            </Link>
            <Button asChild className="mt-1 w-full">
              <Link href="/signup" onClick={() => setOpen(false)}>
                {t("Start free trial")}
              </Link>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
