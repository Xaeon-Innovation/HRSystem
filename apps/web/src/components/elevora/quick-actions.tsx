import * as React from "react";
import { cn } from "@/lib/utils";

export type QuickAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
};

export type QuickActionsProps = {
  actions: QuickAction[];
  className?: string;
};

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6",
        className,
      )}
    >
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={a.onClick}
          className="flex flex-col items-center gap-2 text-center"
        >
          <span className="inline-grid h-12 w-12 place-items-center rounded-sm border border-line-strong bg-surface text-ink-2 transition-colors hover:bg-surface-2">
            {a.icon}
          </span>
          <span className="text-2xs font-medium text-ink-2">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
