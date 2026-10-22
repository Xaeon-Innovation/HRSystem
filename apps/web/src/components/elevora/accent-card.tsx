import * as React from "react";
import { cn } from "@/lib/utils";

export type AccentCardProps = {
  children: React.ReactNode;
  variant?: "accent" | "mono";
  className?: string;
};

export function AccentCard({
  children,
  variant = "accent",
  className,
}: AccentCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg p-5",
        variant === "accent"
          ? "bg-accent text-accent-ink"
          : "bg-surface-2 text-ink",
        className,
      )}
    >
      <span
        className="pointer-events-none absolute -end-6 -top-6 h-24 w-24 rounded-full bg-white/25"
        aria-hidden
      />
      {children}
    </div>
  );
}
