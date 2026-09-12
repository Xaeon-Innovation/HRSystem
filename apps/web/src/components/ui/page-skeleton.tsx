import { cn } from "@/lib/utils";
import { t } from "@/i18n";

/** Shared route / module loading chrome — shimmer bars with light stagger. */
export function PageSkeleton({
  className,
  dense = false,
}: {
  className?: string;
  dense?: boolean;
}) {
  return (
    <div
      className={cn("space-y-4", className)}
      aria-busy="true"
      aria-label={t("Loading")}
    >
      <div
        className="skeleton-block h-10 max-w-xs rounded-xl"
        style={{ animationDelay: "0ms" }}
      />
      <div
        className="skeleton-block h-4 max-w-md rounded-lg"
        style={{ animationDelay: "40ms" }}
      />
      <div
        className={cn(
          "grid gap-3",
          dense ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2 md:grid-cols-4",
        )}
      >
        {Array.from({ length: dense ? 3 : 4 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-block h-24 rounded-xl"
            style={{ animationDelay: `${80 + i * 50}ms` }}
          />
        ))}
      </div>
      <div
        className="skeleton-block h-64 rounded-xl"
        style={{ animationDelay: "260ms" }}
      />
    </div>
  );
}
