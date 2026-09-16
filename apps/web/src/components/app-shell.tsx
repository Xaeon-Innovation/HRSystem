"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Palette,
  Settings,
  Timer,
  Users,
  Building2,
  UserCircle,
  Inbox,
  Receipt,
  ToggleLeft,
  type LucideIcon,
} from "lucide-react";
import {
  api,
  clearSession,
  getTokens,
  getUser,
  mediaUrl,
  setSession,
  updateSessionUser,
  type AuthUser,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { ClockStatusProvider } from "@/components/clock-status-provider";
import { UserAvatar, initialsOf } from "@/components/user-avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { PreviewBadge } from "@/components/ui/preview-badge";
import { BrandingSheet } from "@/components/branding-sheet";
import { useTenantBrand } from "@/components/brand-provider";
import { NavigationProgress, PageTransition } from "@/components/page-motion";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import { isUiRedesignEnabled } from "@/lib/ui-redesign";
import { userHasModule, workspaceUnlocksAll } from "@/lib/permissions";
import { PlatformRoleGate } from "@/lib/platform-gate";
import { FeatureGate } from "@/lib/feature-gate";
import { WorkspaceChrome } from "@/components/workspace-chrome";
import { t } from "@/i18n";
import {
  adminHrefFor,
  employeeHrefFor,
  moduleIcon,
  moduleLabel,
  moduleNavFlagsFromFeatures,
  type ModuleNavFlags,
} from "@/lib/module-nav";
import type { ModuleKey } from "@hr/shared";

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  preview?: boolean;
};

type NavSection = { title: string; links: NavLink[] };

type NavOptions = {
  managesTeam?: boolean;
  features?: ModuleNavFlags;
};

const ROLE_LABEL: Record<AuthUser["role"], string> = {
  super_admin: "Platform admin",
  tenant_admin: "Admin",
  employee: "Employee",
};

function homeHrefFor(user: AuthUser) {
  if (user.role === "super_admin") return "/app";
  if (user.role === "tenant_admin") return "/app";
  return "/app/clock";
}

function WorkspaceMark({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl?: string | null;
}) {
  const src = mediaUrl(logoUrl);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);
  return (
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/10 text-[11px] font-semibold tracking-tight text-primary ring-1 ring-black/[0.06] md:h-9 md:w-9 dark:ring-white/10">
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="h-full w-full object-contain p-0.5"
          onError={() => setBroken(true)}
        />
      ) : (
        <span>{initialsOf(name)}</span>
      )}
    </span>
  );
}

function featuresOf(user: AuthUser): ModuleNavFlags {
  return moduleNavFlagsFromFeatures(
    user.planFeatures,
    workspaceUnlocksAll(user),
  );
}

function pushModule(
  links: NavLink[],
  features: ModuleNavFlags | undefined,
  key: ModuleKey,
  opts?: { href?: string; label?: string },
) {
  if (!features?.[key]) return;
  links.push({
    href: opts?.href ?? adminHrefFor(key),
    label: opts?.label ?? moduleLabel(key),
    icon: moduleIcon(key),
  });
}

const flatLinksFor = (user: AuthUser, opts: NavOptions = {}): NavLink[] => {
  if (user.role === "super_admin" && !user.tenantId) {
    return [
      { href: "/app", label: t("Overview"), icon: LayoutDashboard },
      { href: "/app/tenants", label: t("Tenants"), icon: Building2 },
      { href: "/app/subscriptions", label: t("Subscriptions"), icon: CreditCard },
      { href: "/app/leads", label: t("Leads"), icon: Inbox },
      { href: "/app/plans", label: t("Plans"), icon: Package },
      { href: "/app/features", label: t("Features"), icon: ToggleLeft },
      { href: "/app/payments", label: t("Payments"), icon: Receipt },
      { href: "/app/audits", label: t("Audits"), icon: FileText },
      { href: "/app/health", label: t("Health"), icon: Activity },
      { href: "/app/profile", label: t("Profile"), icon: UserCircle },
    ];
  }
  if (user.role === "tenant_admin" || (user.role === "super_admin" && user.tenantId)) {
    const links: NavLink[] = [
      { href: "/app", label: t("Dashboard"), icon: LayoutDashboard },
    ];
    pushModule(links, opts.features, "teamToday");
    pushModule(links, opts.features, "liveMap", { label: t("Live Map") });
    pushModule(links, opts.features, "integrations");
    pushModule(links, opts.features, "analytics");
    links.push({ href: "/app/employees", label: t("Employees"), icon: Users });
    links.push({ href: "/app/shifts", label: t("Shifts"), icon: CalendarDays });
    pushModule(links, opts.features, "hiring");
    pushModule(links, opts.features, "kpis");
    pushModule(links, opts.features, "leave");
    pushModule(links, opts.features, "compensation");
    pushModule(links, opts.features, "tasks");
    links.push(
      { href: "/app/notifications", label: t("Alerts"), icon: Bell },
      { href: "/app/billing", label: t("Billing"), icon: CreditCard },
      { href: "/app/health", label: t("Health"), icon: ClipboardList },
      { href: "/app/clock", label: t("Clock"), icon: Timer },
      { href: "/app/profile", label: t("Profile"), icon: UserCircle },
    );
    return links;
  }

  const links: NavLink[] = [
    { href: "/app/clock", label: t("Clock"), icon: Timer },
    { href: "/app/attendance", label: t("History"), icon: ClipboardList },
  ];
  if (opts.managesTeam) {
    pushModule(links, opts.features, "teamToday");
  }
  pushModule(links, opts.features, "kpis", {
    label: userHasModule(user, "kpis") ? t("KPIs") : t("My KPIs"),
  });
  pushModule(links, opts.features, "leave");
  if (userHasModule(user, "hiring")) {
    pushModule(links, opts.features, "hiring");
  }
  if (userHasModule(user, "compensation")) {
    pushModule(links, opts.features, "compensation");
  }
  pushModule(links, opts.features, "tasks");
  pushModule(links, opts.features, "analytics", {
    href: employeeHrefFor("analytics"),
    label: t("My analytics"),
  });
  links.push(
    { href: "/app/notifications", label: t("Alerts"), icon: Bell },
    { href: "/app/profile", label: t("Profile"), icon: UserCircle },
  );
  return links;
};

/** Grouped nav for redesign; treats entered superadmin like tenant admin. */
const groupedNavFor = (user: AuthUser, opts: NavOptions = {}): NavSection[] => {
  if (user.role === "super_admin" && !user.tenantId) {
    return [{ title: t("Platform"), links: flatLinksFor(user, opts) }];
  }

  if (user.role === "tenant_admin" || (user.role === "super_admin" && user.tenantId)) {
    const operate: NavLink[] = [
      { href: "/app", label: t("Dashboard"), icon: LayoutDashboard },
    ];
    pushModule(operate, opts.features, "teamToday");
    pushModule(operate, opts.features, "liveMap", { label: t("Live Map") });
    operate.push(
      { href: "/app/clock", label: t("Clock"), icon: Timer },
      { href: "/app/attendance", label: t("Attendance"), icon: ClipboardList },
      { href: "/app/notifications", label: t("Alerts"), icon: Bell },
    );

    const people: NavLink[] = [
      { href: "/app/employees", label: t("Employees"), icon: Users },
      { href: "/app/shifts", label: t("Shifts"), icon: CalendarDays },
    ];
    pushModule(people, opts.features, "leave");
    pushModule(people, opts.features, "hiring");
    pushModule(people, opts.features, "tasks");

    const perform: NavLink[] = [];
    pushModule(perform, opts.features, "kpis");
    pushModule(perform, opts.features, "analytics");
    pushModule(perform, opts.features, "compensation");

    const system: NavLink[] = [];
    pushModule(system, opts.features, "integrations");
    system.push(
      { href: "/app/settings", label: t("Settings"), icon: Settings },
      { href: "/app/billing", label: t("Billing"), icon: CreditCard },
      { href: "/app/health", label: t("Health"), icon: Activity },
      { href: "/app/profile", label: t("Profile"), icon: UserCircle },
    );

    const sections: NavSection[] = [{ title: t("Operate"), links: operate }];
    if (people.length) sections.push({ title: t("People"), links: people });
    if (perform.length) sections.push({ title: t("Perform"), links: perform });
    sections.push({ title: t("System"), links: system });
    return sections;
  }

  const operate: NavLink[] = [
    { href: "/app/clock", label: t("Clock"), icon: Timer },
    { href: "/app/attendance", label: t("History"), icon: ClipboardList },
  ];
  if (opts.managesTeam) {
    pushModule(operate, opts.features, "teamToday");
  }
  operate.push({ href: "/app/notifications", label: t("Alerts"), icon: Bell });

  const people: NavLink[] = [];
  pushModule(people, opts.features, "leave");
  if (userHasModule(user, "hiring")) {
    pushModule(people, opts.features, "hiring");
  }
  pushModule(people, opts.features, "tasks");

  const perform: NavLink[] = [];
  pushModule(perform, opts.features, "kpis", {
    label: userHasModule(user, "kpis") ? t("KPIs") : t("My KPIs"),
  });
  pushModule(perform, opts.features, "analytics", {
    href: employeeHrefFor("analytics"),
    label: t("My analytics"),
  });
  if (userHasModule(user, "compensation")) {
    pushModule(perform, opts.features, "compensation");
  }

  const sections: NavSection[] = [{ title: t("Operate"), links: operate }];
  if (people.length) sections.push({ title: t("People"), links: people });
  if (perform.length) sections.push({ title: t("Perform"), links: perform });
  sections.push({
    title: t("Account"),
    links: [{ href: "/app/profile", label: t("Profile"), icon: UserCircle }],
  });
  return sections;
};

function linkActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavItem({
  link,
  pathname,
  unread,
}: {
  link: NavLink;
  pathname: string;
  unread: number;
}) {
  const Icon = link.icon;
  const active = linkActive(pathname, link.href);
  return (
    <Link
      href={link.href}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-[background-color,color,transform] duration-200 ease-out md:w-full",
        active
          ? "bg-accent/80 text-accent-foreground backdrop-blur-sm"
          : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground active:scale-[0.98]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{link.label}</span>
      {link.preview ? <PreviewBadge className="ml-0.5" /> : null}
      {link.href === "/app/notifications" && unread > 0 ? (
        <span
          className={cn(
            "ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            active ? "bg-accent-foreground/15" : "bg-primary/15 text-primary",
          )}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [unread, setUnread] = useState(0);
  const [managesTeam, setManagesTeam] = useState(false);
  const [redesign, setRedesign] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const brand = useTenantBrand();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    setRedesign(isUiRedesignEnabled(u));
  }, [router]);

  useEffect(() => {
    void api<AuthUser>("/v1/auth/me")
      .then(async (me) => {
        updateSessionUser(me);
        setUser(me);
        setRedesign(isUiRedesignEnabled(me));
        const { refresh } = getTokens();
        if (!refresh) return;
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/v1/auth/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken: refresh }),
            },
          );
          if (!res.ok) return;
          const tokens = (await res.json()) as {
            accessToken: string;
            refreshToken: string;
          };
          setSession(tokens.accessToken, tokens.refreshToken, me);
        } catch {
          /* keep existing tokens */
        }
      })
      .catch(() => {
        /* keep the cached session user */
      });
  }, []);

  useEffect(() => {
    const sync = () => {
      const u = getUser();
      if (u) {
        setUser(u);
        setRedesign(isUiRedesignEnabled(u));
      }
    };
    window.addEventListener("hr-session-user", sync);
    window.addEventListener("hr-ui-redesign", sync);
    return () => {
      window.removeEventListener("hr-session-user", sync);
      window.removeEventListener("hr-ui-redesign", sync);
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.role === "super_admin" && user.tenantId) {
      setManagesTeam(true);
      return;
    }
    if (user.role === "super_admin" || user.role === "tenant_admin") {
      setManagesTeam(user.role === "tenant_admin");
      return;
    }
    let cancelled = false;
    void api<{ count: number }>("/v1/employees/managed")
      .then((res) => {
        if (!cancelled) setManagesTeam((res.count ?? 0) > 0);
      })
      .catch(() => {
        if (!cancelled) setManagesTeam(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

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
  }, [user]);

  const sections = useMemo(() => {
    if (!user) return [];
    const opts = {
      managesTeam,
      features: featuresOf(user),
    };
    return redesign
      ? groupedNavFor(user, opts)
      : [{ title: "", links: flatLinksFor(user, opts) }];
  }, [user, redesign, managesTeam]);

  const flatLinks = useMemo(
    () => sections.flatMap((s) => s.links),
    [sections],
  );

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <PageSkeleton dense className="w-full max-w-lg" />
      </div>
    );
  }

  const productName = redesign ? brand.brandingName : "Elevora";

  const shell = (
    <div className="flex min-h-dvh w-full flex-col">
      <WorkspaceChrome user={user} onUserChange={setUser} />
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside
        className={cn(
          "flex flex-col border-b border-white/40 bg-card md:sticky md:top-0 md:h-dvh md:shrink-0 md:border-b-0 md:border-r md:border-white/40 dark:border-white/10",
          redesign ? "md:w-64" : "md:w-60",
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-border/70 px-3 py-2.5">
          <Link
            href={homeHrefFor(user)}
            aria-label={productName}
            className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none ring-offset-background transition-colors hover:bg-secondary/70 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <WorkspaceMark
              name={productName}
              logoUrl={redesign ? brand.logoUrl : null}
            />
            <div className="min-w-0">
              <p
                title={productName}
                className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground"
              >
                {productName}
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1 md:hidden">
            <LanguageToggle showLabels={false} />
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
        <nav className="app-sidebar-nav flex gap-1 overflow-x-auto px-2 pb-3 md:flex-1 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:px-3">
          {redesign
            ? sections.map((section) => (
                <div key={section.title} className="mb-2 hidden md:block">
                  <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {section.title}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {section.links.map((l) => (
                      <NavItem
                        key={l.href}
                        link={l}
                        pathname={pathname}
                        unread={unread}
                      />
                    ))}
                  </div>
                </div>
              ))
            : null}
          {/* Mobile: flat scroll; desktop redesign uses sections above */}
          <div className={cn("flex gap-1 md:contents", redesign && "md:hidden")}>
            {(redesign ? flatLinks : sections[0]?.links ?? []).map((l) => (
              <NavItem
                key={`m-${l.href}`}
                link={l}
                pathname={pathname}
                unread={unread}
              />
            ))}
          </div>
        </nav>
        <div className="hidden border-t border-border/70 p-3 md:block">
          <Link
            href="/app/profile"
            aria-label={t("Open profile")}
            className="mb-2 flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-secondary/70"
          >
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-tight">
                {user.name}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {t(ROLE_LABEL[user.role])}
              </span>
            </span>
          </Link>
          <div className="space-y-2">
            {redesign && user.role === "tenant_admin" ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setBrandOpen(true)}
              >
                <Palette className="h-4 w-4" />
                {t("Branding")}</Button>
            ) : null}
            <LanguageToggle className="w-full" />
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
              {t("Sign out")}</Button>
          </div>
        </div>
      </aside>
      <main
        className={cn(
          "min-w-0 flex-1 p-4 md:p-6",
          redesign && "space-y-0 md:p-8",
        )}
      >
        {user.accessAllowed === false && user.role === "tenant_admin" ? (
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-sm text-foreground">
              {t(
                "Your subscription has ended. Choose a plan to restore access.",
              )}
            </p>
            {pathname !== "/app/billing" ? (
              <Button asChild className="w-full shrink-0 sm:w-auto">
                <Link href="/app/billing">{t("Billing")}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        {user.accessAllowed === false && user.role === "employee" ? (
          <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            <p className="font-medium">{t("Subscription ended")}</p>
            <p className="mt-1 text-muted-foreground">
              {t("Contact your admin to renew the subscription.")}
            </p>
          </div>
        ) : null}
        <NavigationProgress />
        <PageTransition>
          <PlatformRoleGate>
            <FeatureGate>{children}</FeatureGate>
          </PlatformRoleGate>
        </PageTransition>
      </main>
      {redesign ? (
        <BrandingSheet open={brandOpen} onOpenChange={setBrandOpen} />
      ) : null}
      </div>
    </div>
  );

  if (user.role === "super_admin" && !user.tenantId) {
    return shell;
  }

  return <ClockStatusProvider>{shell}</ClockStatusProvider>;
}
