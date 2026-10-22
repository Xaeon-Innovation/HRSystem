import * as React from "react";
import { cn } from "@/lib/utils";
import { statusTone, type Tone } from "@/lib/status-tone";

const toneClass: Record<Tone, string> = {
  ok: "bg-accent-tint text-accent-ink",
  warn: "bg-warn/20 text-warn",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
  yellow: "bg-yellow/25 text-ink",
  ink: "bg-ink text-primary-foreground",
  neutral: "bg-surface-2 text-ink-2",
};

export type ChipProps = {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
};

/** 22px pill, 11px/600. */
export function Chip({ children, tone = "neutral", className }: ChipProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-[11px] font-semibold",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export type StatusChipProps = {
  /** Domain status text; the tone is derived from `lib/status-tone`. */
  status: string;
  /** Visible label when it differs from the raw status (e.g. translated). */
  label?: React.ReactNode;
  className?: string;
};

export function StatusChip({ status, label, className }: StatusChipProps) {
  return (
    <Chip tone={statusTone(status)} className={className}>
      {label ?? status}
    </Chip>
  );
}
