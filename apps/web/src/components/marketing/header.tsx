"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { t } from "@/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
] as const;

const compactToggle =
  "[&_button]:min-h-8 [&_button]:min-w-8 [&_button]:px-2 [&_button]:py-1";

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto] items-center gap-3 px-4 sm:px-6 md:grid-cols-[1fr_auto_1fr]">
        <Link href="/" className="min-w-0 justify-self-start">
          <span className="font-display block text-lg font-semibold tracking-tight text-foreground">
            Elevora
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
                pathname === item.href && "text-foreground",
              )}
            >
              {t(item.label)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center justify-end gap-4 justify-self-end">
          <div className="hidden items-center gap-1.5 md:flex">
            <LanguageToggle showLabels={false} className={compactToggle} />
            <ThemeToggle showLabels={false} className={compactToggle} />
          </div>

          <span
            aria-hidden
            className="hidden h-4 w-px bg-border md:block"
          />

          <Link
            href="/login"
            className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground md:inline"
          >
            {t("Sign in")}
          </Link>

          <Button
            asChild
            size="sm"
            className="hidden shadow-md shadow-primary/30 md:inline-flex"
          >
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
        <div className="border-t border-border/60 px-4 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2.5 text-sm text-foreground"
                onClick={() => setOpen(false)}
              >
                {t(item.label)}
              </Link>
            ))}
            <Link
              href="/login"
              className="rounded-md px-3 py-2.5 text-sm text-foreground"
              onClick={() => setOpen(false)}
            >
              {t("Sign in")}
            </Link>
            <Button asChild className="mt-2 w-full">
              <Link href="/signup" onClick={() => setOpen(false)}>
                {t("Start free trial")}
              </Link>
            </Button>
            <div className="mt-3 flex items-center gap-2">
              <LanguageToggle showLabels={false} className={compactToggle} />
              <ThemeToggle showLabels={false} className={compactToggle} />
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
