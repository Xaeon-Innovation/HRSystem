"use client";

import Link from "next/link";
import * as React from "react";
import { ProductComposite } from "@/components/marketing/product-composite";
import { cn } from "@/lib/utils";

export type MarketingAuthShellProps = {
  children: React.ReactNode;
  claimTitle?: string;
  claimSub?: string;
  className?: string;
};

/** Split auth: form on start, product composite on end (hidden below 1080px). */
export function MarketingAuthShell({
  children,
  claimTitle,
  claimSub,
  className,
}: MarketingAuthShellProps) {
  return (
    <div
      className={cn(
        "grid min-h-[calc(100dvh-20px-58px)] flex-1 grid-cols-1 frame:grid-cols-2",
        className,
      )}
    >
      <div className="flex flex-col border-line px-5 py-7 sm:px-9 frame:border-e">
        <Link href="/" className="mb-8 flex items-center gap-2.5 self-start">
          <span className="grid h-7 w-7 place-items-center rounded-[8px] bg-ink text-primary-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 2.5 13.9 10.1 21.5 12 13.9 13.9 12 21.5 10.1 13.9 2.5 12 10.1 10.1Z"
                fill="currentColor"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="text-[15px] font-bold tracking-[0.04em] text-ink">
            POLARA
          </span>
        </Link>

        <div className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center">
          {children}
        </div>

        <p className="mt-8 text-2xs text-ink-muted">© 2026 Xaeon</p>
      </div>

      <div className="hidden flex-col justify-between gap-8 border-line bg-surface p-7 frame:flex">
        <div className="flex flex-1 items-center">
          <ProductComposite className="w-full" />
        </div>
        {(claimTitle || claimSub) && (
          <div>
            {claimTitle ? (
              <h2 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.03em] text-ink">
                {claimTitle}
              </h2>
            ) : null}
            {claimSub ? (
              <p className="mt-1.5 text-sm text-ink-muted">{claimSub}</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
