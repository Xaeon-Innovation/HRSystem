"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export type LeaveSection =
  | "requests"
  | "balances"
  | "calendar"
  | "policies"
  | "reports";

const BASE: { href: string; label: string; section: LeaveSection; adminOnly?: boolean }[] = [
  { href: "/app/leave", label: t("Requests"), section: "requests" },
  { href: "/app/leave/balances", label: t("Balances"), section: "balances" },
  { href: "/app/leave/calendar", label: t("Calendar"), section: "calendar" },
  {
    href: "/app/leave/policies",
    label: t("Policies"),
    section: "policies",
    adminOnly: true,
  },
  { href: "/app/leave/reports", label: t("Reports"), section: "reports" },
];

export function LeaveSubNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const items = BASE.filter((i) => !i.adminOnly || isAdmin);

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      <div className="inline-flex min-w-min gap-1 rounded-lg bg-secondary p-1">
        {items.map((item) => {
          const active =
            item.section === "requests"
              ? pathname === "/app/leave"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "shrink-0 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
