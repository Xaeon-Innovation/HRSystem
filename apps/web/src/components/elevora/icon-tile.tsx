import * as React from "react";
import { cn } from "@/lib/utils";

export type IconTileTone =
  | "neutral"
  | "ink"
  | "accent"
  | "warn"
  | "danger"
  | "info";

const toneStyles: Record<IconTileTone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  ink: "bg-ink text-primary-foreground",
  accent: "bg-accent-tint text-accent-ink",
  warn: "bg-warn/20 text-warn",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
};

export type IconTileProps = {
  children: React.ReactNode;
  tone?: IconTileTone;
  size?: "default" | "lg";
  className?: string;
};

export function IconTile({
  children,
  tone = "neutral",
  size = "default",
  className,
}: IconTileProps) {
  return (
    <span
      className={cn(
        "inline-grid place-items-center rounded-[9px]",
        size === "lg" ? "h-11 w-11" : "h-8 w-8",
        toneStyles[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
