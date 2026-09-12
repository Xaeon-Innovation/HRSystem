"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function ThemeToggle({
  className,
  showLabels = true,
}: {
  className?: string;
  showLabels?: boolean;
}) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-lg border border-white/40 bg-muted/55 p-0.5 backdrop-blur-md dark:border-white/10",
        className,
      )}
      role="group"
      aria-label={t("Color theme")}
    >
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-label={t("Light mode")}
        aria-pressed={mounted ? !isDark : undefined}
        className={cn(
          "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
          mounted && !isDark
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Sun className="h-3.5 w-3.5" />
        {showLabels ? t("Light") : null}
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-label={t("Dark mode")}
        aria-pressed={mounted ? isDark : undefined}
        className={cn(
          "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
          mounted && isDark
            ? "bg-card text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Moon className="h-3.5 w-3.5" />
        {showLabels ? t("Dark") : null}
      </button>
    </div>
  );
}
