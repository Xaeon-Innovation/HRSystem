import * as React from "react";
import { cn } from "@/lib/utils";

/** Page-level H1. Prefer PageHeader from elevora for new pages. */
export function PageTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[1.65rem]",
        className,
      )}
      {...props}
    />
  );
}

/** Compact label on overview / metric tiles. */
export const statCardLabelClass =
  "text-xs font-semibold uppercase tracking-[0.06em] text-ink-muted";
