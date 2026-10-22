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
        "inline-flex h-10 items-center rounded-sm border border-line bg-surface p-0.5",
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
          "inline-flex min-h-9 min-w-9 flex-1 items-center justify-center rounded-[8px] px-2.5 text-xs font-medium transition-colors duration-150",
          current === "en"
            ? "bg-surface-3 font-semibold text-ink"
            : "text-ink-muted hover:text-ink",
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
          "inline-flex min-h-9 min-w-9 flex-1 items-center justify-center rounded-[8px] px-2.5 text-xs font-medium transition-colors duration-150",
          current === "ar"
            ? "bg-surface-3 font-semibold text-ink"
            : "text-ink-muted hover:text-ink",
        )}
      >
        {showLabels ? t("Arabic") : "ع"}
      </button>
    </div>
  );
}
