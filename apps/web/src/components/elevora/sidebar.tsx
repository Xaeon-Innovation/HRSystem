"use client";

import * as React from "react";
import Link from "next/link";
import { PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarProps = {
  children: React.ReactNode;
  upsell?: React.ReactNode;
  onCollapse?: () => void;
  className?: string;
};

export function Sidebar({ children, upsell, onCollapse, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-frame p-3.5 pt-5",
        className,
      )}
    >
      <nav className="app-sidebar-nav min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {children}
      </nav>
      {upsell ? <div className="mt-4 shrink-0">{upsell}</div> : null}
      {onCollapse ? (
        <button
          type="button"
          onClick={onCollapse}
          className="mt-3 flex shrink-0 items-center gap-2 px-2 py-2 text-sm text-ink-2 hover:text-ink"
        >
          <PanelLeftClose className="h-4 w-4 rtl:-scale-x-100" aria-hidden />
          Collapse
        </button>
      ) : null}
    </aside>
  );
}

export type NavGroupProps = {
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function NavGroup({ label, children, className }: NavGroupProps) {
  return (
    <div className={cn("mb-3.5 last:mb-0", className)}>
      {label ? (
        <div className="px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-ink-muted">
          {label}
        </div>
      ) : null}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

export type NavItemProps = {
  href: string;
  active?: boolean;
  open?: boolean;
  showChevron?: boolean;
  icon?: React.ReactNode;
  count?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export function NavItem({
  href,
  active,
  open,
  showChevron,
  icon,
  count,
  className,
  children,
  onClick,
}: NavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "relative flex min-h-9 items-center gap-[11px] rounded-sm px-3 py-[9px] text-[13.5px] font-medium leading-none text-ink-2 transition-colors duration-150 hover:bg-surface-2 hover:text-ink",
        active && "bg-surface font-semibold text-ink shadow-md",
        open && "open",
        className,
      )}
    >
      {active ? (
        <span
          className="absolute start-0 top-1.5 bottom-1.5 w-[3px] rounded-e-sm bg-ink"
          aria-hidden
        />
      ) : null}
      {icon ? (
        <span
          className="inline-flex size-[18px] shrink-0 items-center justify-center [&_svg]:block [&_svg]:h-[18px] [&_svg]:w-[18px]"
          aria-hidden
        >
          {icon}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate leading-none">{children}</span>
      {count != null ? (
        <span className="ms-auto inline-flex shrink-0 items-center">{count}</span>
      ) : null}
      {showChevron ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={cn(
            "ms-auto h-[15px] w-[15px] shrink-0 text-ink-muted transition-transform duration-200",
            open && "rotate-180",
            count != null && "ms-1",
          )}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      ) : null}
    </Link>
  );
}

export type NavSubProps = {
  children: React.ReactNode;
  className?: string;
};

export function NavSub({ children, className }: NavSubProps) {
  return (
    <div
      className={cn(
        "ms-[21px] border-s border-line-strong py-0.5",
        className,
      )}
    >
      {children}
    </div>
  );
}

export type NavSubItemProps = {
  href: string;
  active?: boolean;
  count?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
};

export function NavSubItem({
  href,
  active,
  count,
  children,
  className,
  onClick,
}: NavSubItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "ms-2 flex items-center gap-2 rounded-[8px] px-3 py-1.5 text-[12.5px] text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink",
        active && "font-semibold text-ink",
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {count != null ? (
        <span className="ms-auto inline-flex shrink-0 items-center">{count}</span>
      ) : null}
    </Link>
  );
}
