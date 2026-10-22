import * as React from "react";
import { cn } from "@/lib/utils";

export type StepItem = {
  id: string;
  label: string;
};

export type StepsProps = {
  steps: StepItem[];
  currentIndex: number;
  className?: string;
};

export function Steps({ steps, currentIndex, className }: StepsProps) {
  return (
    <ol className={cn("flex flex-wrap gap-1", className)}>
      {steps.map((step, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li
            key={step.id}
            className={cn(
              "flex min-w-0 flex-1 items-center gap-2 rounded-sm border px-3 py-2 text-xs font-medium",
              active
                ? "border-line bg-surface-3 text-ink"
                : done
                  ? "border-line bg-surface text-ink-2"
                  : "border-line bg-surface text-ink-muted",
            )}
          >
            <span
              className={cn(
                "inline-grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] tabular",
                active || done
                  ? "bg-ink text-primary-foreground"
                  : "bg-surface-2 text-ink-muted",
              )}
            >
              {i + 1}
            </span>
            <span className="truncate">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
