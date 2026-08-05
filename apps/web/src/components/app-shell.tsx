"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Timer,
  Users,
  Building2,
} from "lucide-react";
import { clearSession, getUser, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const linksFor = (user: AuthUser) => {
  if (user.role === "super_admin") {
    return [{ href: "/app/tenants", label: "Tenants", icon: Building2 }];
  }
  if (user.role === "tenant_admin") {
    return [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/employees", label: "Employees", icon: Users },
      { href: "/app/map", label: "Live Map", icon: MapPinned },
      { href: "/app/kpis", label: "KPIs", icon: ClipboardList },
      { href: "/app/notifications", label: "Alerts", icon: Bell },
      { href: "/app/health", label: "Health", icon: ClipboardList },
      { href: "/app/clock", label: "Clock", icon: Timer },
    ];
  }
  return [
    { href: "/app/clock", label: "Clock", icon: Timer },
    { href: "/app/attendance", label: "History", icon: ClipboardList },
    { href: "/app/kpis", label: "My KPIs", icon: ClipboardList },
    { href: "/app/notifications", label: "Alerts", icon: Bell },
  ];
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, [router]);

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const links = linksFor(user);

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col md:flex-row">
      <aside className="border-b border-border/80 bg-white/70 backdrop-blur md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-2 px-4 py-4 md:flex-col md:items-stretch">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-primary">
              HR Track
            </p>
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-col md:overflow-visible md:px-3">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm whitespace-nowrap",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground/80 hover:bg-secondary",
                )}
              >
                <Icon className="h-4 w-4" />
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden p-3 md:block">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              clearSession();
              router.push("/login");
            }}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
