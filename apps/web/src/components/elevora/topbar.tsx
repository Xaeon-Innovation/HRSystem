"use client";

import * as React from "react";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Segmented } from "./segmented";

export type SearchFieldProps = {
  placeholder?: string;
  onSearchOpen?: () => void;
  className?: string;
};

export function SearchField({
  placeholder = "Search…",
  onSearchOpen,
  className,
}: SearchFieldProps) {
  return (
    <button
      type="button"
      onClick={onSearchOpen}
      className={cn(
        "flex h-10 min-w-0 flex-1 items-center gap-2 rounded-sm border border-line bg-surface px-3 text-sm text-ink-muted sm:max-w-[330px]",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-start">{placeholder}</span>
      <kbd className="hidden shrink-0 rounded border border-line bg-surface-2 px-1.5 py-0.5 text-2xs font-medium text-ink-muted sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}

export type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const value = mounted && resolvedTheme === "dark" ? "dark" : "light";

  return (
    <Segmented
      className={className}
      aria-label="Theme"
      value={value}
      onChange={(v) => setTheme(v)}
      options={[
        { value: "light", label: <Sun className="h-3.5 w-3.5" aria-hidden /> },
        { value: "dark", label: <Moon className="h-3.5 w-3.5" aria-hidden /> },
      ]}
    />
  );
}

export type IconButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  dot?: boolean;
};

export function IconButton({ className, dot, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "relative inline-grid h-10 w-10 place-items-center rounded-sm border border-line bg-surface text-ink-2 hover:bg-surface-2",
        className,
      )}
      {...props}
    >
      {children}
      {dot ? (
        <span
          className="absolute end-2 top-2 h-2 w-2 rounded-full bg-warn"
          aria-hidden
        />
      ) : null}
    </button>
  );
}

export type TopbarProps = {
  onMenuClick?: () => void;
  onSearchOpen?: () => void;
  langToggle?: React.ReactNode;
  notifications?: React.ReactNode;
  userChip?: React.ReactNode;
  primaryAction?: React.ReactNode;
  className?: string;
};

export function Topbar({
  onMenuClick,
  onSearchOpen,
  langToggle,
  notifications,
  userChip,
  primaryAction,
  className,
}: TopbarProps) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-center gap-2 border-b border-line px-3 py-3 sm:gap-2.5 sm:px-4 md:px-5",
        className,
      )}
    >
      <button
        type="button"
        onClick={onMenuClick}
        className="inline-grid h-10 w-10 place-items-center rounded-sm border border-line bg-surface text-ink frame:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <SearchField onSearchOpen={onSearchOpen} />
      <div className="ms-auto flex flex-wrap items-center gap-2">
        <ThemeToggle />
        {langToggle}
        {notifications}
        {userChip}
        {primaryAction}
      </div>
    </header>
  );
}
