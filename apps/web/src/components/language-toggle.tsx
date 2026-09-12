"use client";

import { cn } from "@/lib/utils";
import { getLocale, setLocale, type AppLocale } from "@/lib/locale";
import { t } from "@/i18n";
import { useLocale } from "@/i18n/provider";

export function LanguageToggle({
  className,
  showLabels = true,
}: {
  className?: string;
  showLabels?: boolean;
}) {
  const locale = useLocale();
  const current: AppLocale = locale || getLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-white/40 bg-muted/55 p-0.5 backdrop-blur-md dark:border-white/10",
        className,
      )}
      role="group"
      aria-label={t("Language")}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        aria-pressed={current === "en"}
        aria-label={t("English")}
        className={cn(
          "inline-flex min-h-10 min-w-10 flex-1 items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
          current === "en"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {showLabels ? t("English") : "EN"}
      </button>
      <button
        type="button"
        onClick={() => setLocale("ar")}
        aria-pressed={current === "ar"}
        aria-label={t("Arabic")}
        className={cn(
          "inline-flex min-h-10 min-w-10 flex-1 items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
          current === "ar"
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {showLabels ? t("Arabic") : "ع"}
      </button>
    </div>
  );
}
