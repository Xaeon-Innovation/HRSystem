import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const stairPattern = [
  0, 0, 0, 1, 0, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1,
];

export type TipCardProps = {
  title: string;
  copy: React.ReactNode;
  href?: string;
  linkLabel?: string;
  className?: string;
};

export function TipCard({ title, copy, href, linkLabel = "Learn more", className }: TipCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-line bg-surface p-4",
        className,
      )}
    >
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-xs text-ink-muted">{copy}</p>
      {href ? (
        <Link
          href={href}
          className="mt-2 inline-block text-xs font-medium text-accent-strong hover:underline"
        >
          {linkLabel}
        </Link>
      ) : null}
      <div
        className="pointer-events-none absolute bottom-0 end-0 grid w-[88px] grid-cols-4 gap-0.5 p-2 opacity-90"
        aria-hidden
      >
        {stairPattern.map((on, i) => (
          <span
            key={i}
            className={cn(
              "aspect-square rounded-[2px]",
              on ? (i % 3 ? "hatch" : "hatch-soft") : "bg-transparent",
            )}
          />
        ))}
      </div>
    </div>
  );
}
