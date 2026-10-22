import * as React from "react";
import { cn } from "@/lib/utils";
import { StatusText } from "./status-text";

export type ListRowProps = {
  leading?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  value?: React.ReactNode;
  status?: string;
  className?: string;
};

export function ListRow({
  leading,
  title,
  subtitle,
  value,
  status,
  className,
}: ListRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-line py-3 last:border-b-0",
        className,
      )}
    >
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink">{title}</div>
        {subtitle ? (
          <div className="truncate text-xs text-ink-muted">{subtitle}</div>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        {value ? (
          <span className="tabular text-sm font-semibold text-ink">{value}</span>
        ) : null}
        {status ? <StatusText status={status} /> : null}
      </div>
    </div>
  );
}
