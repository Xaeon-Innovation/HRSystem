import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function PreviewBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-950/70 dark:text-amber-200",
        className,
      )}
    >
      {t("Preview")}</span>
  );
}
