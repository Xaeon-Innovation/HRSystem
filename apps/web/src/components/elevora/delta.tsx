import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export type DeltaProps = {
  value: string;
  context?: string;
  className?: string;
};

export function Delta({ value, context = "from last month", className }: DeltaProps) {
  const up = !String(value).trimStart().startsWith("-");
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1 text-2xs text-ink-muted",
        className,
      )}
    >
      {up ? (
        <TrendingUp className="h-3.5 w-3.5 shrink-0 text-accent-strong" aria-hidden />
      ) : (
        <TrendingDown className="h-3.5 w-3.5 shrink-0 text-warn" aria-hidden />
      )}
      <span className="font-semibold tabular text-ink">{value}</span>
      <span>{context}</span>
    </div>
  );
}
