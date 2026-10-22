import * as React from "react";
import { cn } from "@/lib/utils";

export type StatBlockProps = {
  label: string;
  value: React.ReactNode;
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
  className?: string;
};

const valueSize: Record<NonNullable<StatBlockProps["size"]>, string> = {
  sm: "text-[26px]",
  md: "text-stat",
  lg: "text-stat-lg",
};

export function StatBlock({
  label,
  value,
  size = "md",
  children,
  className,
}: StatBlockProps) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-xs text-ink-muted">{label}</div>
      <div
        className={cn(
          "mt-1 font-semibold tabular tracking-tight text-ink",
          valueSize[size],
        )}
      >
        {value}
      </div>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}
