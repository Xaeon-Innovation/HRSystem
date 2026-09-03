"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Package,
  Timer,
  Users,
  Building2,
  Plug,
  BarChart3,
  Palmtree,
  UserCircle,
  Wallet,
  Briefcase,
} from "lucide-react";
import { api, clearSession, getUser, updateSessionUser, type AuthUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ClockStatusProvider } from "@/components/clock-status-provider";
import { UserAvatar } from "@/components/user-avatar";
import { ThemeToggle } from "@/components/theme-toggle";

const linksFor = (user: AuthUser) => {
  if (user.role === "super_admin") {
    return [
      { href: "/app/tenants", label: "Tenants", icon: Building2 },
      { href: "/app/plans", label: "Plans", icon: Package },
      { href: "/app/subscriptions", label: "Subscriptions", icon: CreditCard },
      { href: "/app/audits", label: "Audits", icon: FileText },
      { href: "/app/health", label: "Health", icon: Activity },
      { href: "/app/profile", label: "Profile", icon: UserCircle },
    ];
  }
  if (user.role === "tenant_admin") {
    return [
      { href: "/app", label: "Dashboard", icon: LayoutDashboard },
      { href: "/app/integrations", label: "Integrations", icon: Plug },
      { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/app/employees", label: "Employees", icon: Users },
      { href: "/app/hiring", label: "Hiring", icon: Briefcase },
      { href: "/app/map", label: "Live Map", icon: MapPinned },
      { href: "/app/kpis", label: "KPIs", icon: ClipboardList },
      { href: "/app/leave", label: "Leave", icon: Palmtree },
      { href: "/app/compensation", label: "Compensation", icon: Wallet },
      { href: "/app/notifications", label: "Alerts", icon: Bell },
      { href: "/app/billing", label: "Billing", icon: CreditCard },
      { href: "/app/health", label: "Health", icon: ClipboardList },
      { href: "/app/clock", label: "Clock", icon: Timer },
      { href: "/app/profile", label: "Profile", icon: UserCircle },
    ];
  }
  return [
    { href: "/app/clock", label: "Clock", icon: Timer },
    { href: "/app/attendance", label: "History", icon: ClipboardList },
    { href: "/app/kpis", label: "My KPIs", icon: ClipboardList },
    { href: "/app/leave", label: "Leave", icon: Palmtree },
    { href: "/app/hiring", label: "Hiring", icon: Briefcase },
    { href: "/app/analytics/me", label: "My analytics", icon: BarChart3 },
    { href: "/app/notifications", label: "Alerts", icon: Bell },
    { href: "/app/profile", label: "Profile", icon: UserCircle },
  ];
};

function linkActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [unread, setUnread] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, [router, pathname]);

  useEffect(() => {
    void api<AuthUser>("/v1/auth/me")
      .then((me) => {
        updateSessionUser(me);
        setUser(me);
      })
      .catch(() => {
        /* keep the cached session user */
      });
  }, []);

  useEffect(() => {
    const sync = () => {
      const u = getUser();
      if (u) setUser(u);
    };
    window.addEventListener("hr-session-user", sync);
    return () => window.removeEventListener("hr-session-user", sync);
  }, []);

  useEffect(() => {
    if (!user || user.role === "super_admin") return;
    let cancelled = false;
    const load = () => {
      void api<{ unread: number }>("/v1/notifications/unread-count")
        .then((data) => {
          if (!cancelled) setUnread(data.unread);
        })
        .catch(() => {
          /* keep last known count */
        });
    };
    load();
    const id = window.setInterval(load, 60_000);
    window.addEventListener("hr-alerts-changed", load);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("hr-alerts-changed", load);
    };
  }, [user, pathname]);

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  const links = linksFor(user);
  const shell = (
      <div className="flex min-h-dvh w-full flex-col md:flex-row">
        <aside className="flex flex-col border-b border-border bg-card md:sticky md:top-0 md:h-dvh md:w-60 md:shrink-0 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between gap-2 px-4 py-4 md:flex-col md:items-stretch">
            <Link
              href="/app/profile"
              className="flex min-w-0 items-center gap-3 rounded-md md:items-start"
            >
              <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  HR Track
                </p>
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
            </Link>
            <div className="flex items-center gap-1 md:hidden">
              <ThemeToggle showLabels={false} />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  clearSession();
                  router.push("/login");
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-2 pb-3 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:px-3">
            {links.map((l) => {
              const Icon = l.icon;
              const active = linkActive(pathname, l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap md:w-full",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {l.label}
                  {l.href === "/app/notifications" && unread > 0 ? (
                    <span
                      className={cn(
                        "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                        active
                          ? "bg-accent-foreground/15"
                          : "bg-primary/15 text-primary",
                      )}
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
          <div className="hidden space-y-2 p-3 md:block">
            <ThemeToggle className="w-full" />
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
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
  );

  if (user.role === "super_admin") {
    return shell;
  }

  return <ClockStatusProvider>{shell}</ClockStatusProvider>;
}
