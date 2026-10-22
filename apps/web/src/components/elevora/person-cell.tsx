import * as React from "react";
import { cn } from "@/lib/utils";

export type PersonCellProps = {
  name: string;
  subtitle?: string;
  avatar?: React.ReactNode;
  className?: string;
};

export function PersonCell({ name, subtitle, avatar, className }: PersonCellProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {avatar ? (
        <div className="shrink-0">{avatar}</div>
      ) : (
        <span className="inline-grid h-8 w-8 shrink-0 place-items-center rounded-sm bg-surface-2 text-2xs font-semibold text-ink">
          {name
            .split(/\s+/)
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-ink">{name}</div>
        {subtitle ? (
          <div className="truncate text-xs text-ink-muted">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
