"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type PillSelectProps = {
  label: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export function PillSelect({ label, children, className, onClick }: PillSelectProps) {
  if (children) {
    return (
      <div className={cn("relative inline-flex", className)}>
        <button
          type="button"
          className="inline-flex h-7 items-center gap-1 rounded-full border border-line-strong bg-surface px-3 text-xs font-medium text-ink"
          onClick={onClick}
        >
          {label}
          <ChevronDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
        </button>
        {children}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-full border border-line-strong bg-surface px-3 text-xs font-medium text-ink",
        className,
      )}
    >
      {label}
      <ChevronDown className="h-3.5 w-3.5 text-ink-muted" aria-hidden />
    </button>
  );
}
