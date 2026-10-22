"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Bell,
  CalendarCheck2,
  CalendarDays,
  ChevronsUpDown,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClockStatusProvider } from "@/components/clock-status-provider";
import { UserAvatar, initialsOf } from "@/components/user-avatar";
import { LanguageToggle } from "@/components/language-toggle";
import { PreviewBadge } from "@/components/ui/preview-badge";
import { useTenantBrand } from "@/components/brand-provider";
import { NavigationProgress, PageTransition } from "@/components/page-motion";
import { PageSkeleton } from "@/components/ui/page-skeleton";
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
import {
  AppFrame,
  NavGroup,
  NavItem,
  NavSub,
  NavSubItem,
  Sidebar,
  Topbar,
  IconButton,
} from "@/components/elevora";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type NavChild = {
  href: string;
  label: string;
};

type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  preview?: boolean;
  children?: NavChild[];
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
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-ink text-[11px] font-semibold tracking-tight text-primary-foreground">
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

/** Grouped nav; treats entered superadmin like tenant admin. */
const groupedNavFor = (user: AuthUser, opts: NavOptions = {}): NavSection[] => {
  if (user.role === "super_admin" && !user.tenantId) {
    return [
      {
        title: t("Platform"),
        links: [
          { href: "/app", label: t("Overview"), icon: LayoutDashboard },
          { href: "/app/tenants", label: t("Tenants"), icon: Building2 },
          {
            href: "/app/subscriptions",
            label: t("Subscriptions"),
            icon: CreditCard,
          },
          { href: "/app/leads", label: t("Leads"), icon: Inbox },
          { href: "/app/plans", label: t("Plans"), icon: Package },
          { href: "/app/features", label: t("Features"), icon: ToggleLeft },
          { href: "/app/payments", label: t("Payments"), icon: Receipt },
          { href: "/app/audits", label: t("Audits"), icon: FileText },
          { href: "/app/health", label: t("Health"), icon: Activity },
        ],
      },
    ];
  }

  if (
    user.role === "tenant_admin" ||
    (user.role === "super_admin" && user.tenantId)
  ) {
    const operate: NavLink[] = [
      { href: "/app", label: t("Dashboard"), icon: LayoutDashboard },
    ];
    pushModule(operate, opts.features, "teamToday");
    pushModule(operate, opts.features, "liveMap", { label: t("Live Map") });
    operate.push(
      { href: "/app/clock", label: t("Clock"), icon: Timer },
      {
        href: "/app/attendance",
        label: t("Attendance"),
        icon: CalendarCheck2,
        children: [
          { href: "/app/attendance", label: t("Day view") },
          { href: "/app/attendance/hours", label: t("Hours report") },
        ],
      },
      { href: "/app/notifications", label: t("Alerts"), icon: Bell },
    );

    const people: NavLink[] = [
      { href: "/app/employees", label: t("Employees"), icon: Users },
      { href: "/app/shifts", label: t("Shifts"), icon: CalendarDays },
    ];
    if (opts.features?.leave) {
      people.push({
        href: "/app/leave",
        label: t("Leave"),
        icon: moduleIcon("leave"),
        children: [
          { href: "/app/leave", label: t("Requests") },
          { href: "/app/leave/balances", label: t("Balances") },
          { href: "/app/leave/calendar", label: t("Calendar") },
          { href: "/app/leave/policies", label: t("Policies") },
          { href: "/app/leave/reports", label: t("Reports") },
        ],
      });
    }
    pushModule(people, opts.features, "hiring");
    pushModule(people, opts.features, "tasks");

    const perform: NavLink[] = [];
    pushModule(perform, opts.features, "kpis");
    if (opts.features?.analytics) {
      perform.push({
        href: "/app/analytics",
        label: t("Analytics"),
        icon: moduleIcon("analytics"),
        children: [
          { href: "/app/analytics", label: t("Overview") },
          { href: "/app/analytics/alerts", label: t("Alerts") },
        ],
      });
    }
    pushModule(perform, opts.features, "compensation");

    const system: NavLink[] = [];
    pushModule(system, opts.features, "integrations");
    system.push(
      { href: "/app/settings", label: t("Settings"), icon: Settings },
      { href: "/app/billing", label: t("Billing"), icon: CreditCard },
      { href: "/app/health", label: t("Health"), icon: Activity },
    );

    const sections: NavSection[] = [{ title: t("Operate"), links: operate }];
    if (people.length) sections.push({ title: t("People"), links: people });
    if (perform.length) sections.push({ title: t("Perform"), links: perform });
    sections.push({ title: t("System"), links: system });
    return sections;
  }

  const me: NavLink[] = [
    { href: "/app/clock", label: t("Clock"), icon: Timer },
    { href: "/app/attendance", label: t("History"), icon: ClipboardList },
    { href: "/app/notifications", label: t("Alerts"), icon: Bell },
  ];

  const workspace: NavLink[] = [];
  pushModule(workspace, opts.features, "leave", { label: t("My leave") });
  pushModule(workspace, opts.features, "tasks", { label: t("My tasks") });
  pushModule(workspace, opts.features, "kpis", {
    label: userHasModule(user, "kpis") ? t("KPIs") : t("My KPIs"),
  });
  pushModule(workspace, opts.features, "analytics", {
    href: employeeHrefFor("analytics"),
    label: t("My analytics"),
  });
  if (opts.managesTeam) {
    pushModule(workspace, opts.features, "teamToday");
  }
  if (userHasModule(user, "hiring")) {
    pushModule(workspace, opts.features, "hiring");
  }
  if (userHasModule(user, "compensation")) {
    pushModule(workspace, opts.features, "compensation");
  }

  const sections: NavSection[] = [{ title: t("Me"), links: me }];
  if (workspace.length)
    sections.push({ title: t("Workspace"), links: workspace });
  return sections;
};

function linkActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function childActive(pathname: string, href: string) {
  return pathname === href;
}

function parentOpen(pathname: string, link: NavLink) {
  if (!link.children?.length) return false;
  if (pathname === link.href || pathname.startsWith(`${link.href}/`)) return true;
  return link.children.some((c) => pathname === c.href || pathname.startsWith(`${c.href}/`));
}

function hasLockedModule(user: AuthUser): boolean {
  if (user.role !== "tenant_admin") return false;
  if (workspaceUnlocksAll(user)) return false;
  const features = featuresOf(user);
  const keys: ModuleKey[] = [
    "liveMap",
    "teamToday",
    "leave",
    "hiring",
    "kpis",
    "compensation",
    "tasks",
    "analytics",
    "integrations",
  ];
  return keys.some((k) => !features[k]);
}

function NavLinks({
  sections,
  pathname,
  unread,
  onNavigate,
}: {
  sections: NavSection[];
  pathname: string;
  unread: number;
  onNavigate?: () => void;
}) {
  return (
    <>
      {sections.map((section) => (
        <NavGroup key={section.title} label={section.title}>
          {section.links.map((l) => {
            const Icon = l.icon;
            const hasChildren = Boolean(l.children?.length);
            const open = hasChildren && parentOpen(pathname, l);
            const active = hasChildren
              ? open
              : linkActive(pathname, l.href);
            return (
              <div key={`${l.href}:${l.label}`}>
                <NavItem
                  href={l.href}
                  active={active}
                  open={open}
                  showChevron={hasChildren}
                  icon={<Icon strokeWidth={1.7} />}
                  count={
                    l.href === "/app/notifications" && unread > 0 ? (
                      <span className="grid min-h-5 min-w-5 place-items-center rounded-full bg-ink px-1.5 text-[10.5px] font-semibold text-primary-foreground tabular">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    ) : l.preview ? (
                      <PreviewBadge />
                    ) : undefined
                  }
                  onClick={onNavigate}
                >
                  {l.label}
                </NavItem>
                {hasChildren && open ? (
                  <NavSub>
                    {l.children!.map((child) => (
                      <NavSubItem
                        key={child.href}
                        href={child.href}
                        active={childActive(pathname, child.href)}
                        onClick={onNavigate}
                      >
                        {child.label}
                      </NavSubItem>
                    ))}
                  </NavSub>
                ) : null}
              </div>
            );
          })}
        </NavGroup>
      ))}
      <div className="my-2 h-px bg-line mx-3" />
      <NavGroup label="">
        <NavItem
          href="/app/profile"
          active={linkActive(pathname, "/app/profile")}
          icon={<UserCircle strokeWidth={1.7} />}
          onClick={() => onNavigate?.()}
        >
          {t("Profile")}
        </NavItem>
      </NavGroup>
    </>
  );
}

function UserChipMenu({
  user,
  onSignOut,
}: {
  user: AuthUser;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 max-w-[200px] items-center gap-2 rounded-sm border border-line bg-surface px-2 pe-2.5 text-start hover:bg-surface-2"
      >
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="sm" />
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block truncate text-xs font-semibold leading-tight text-ink">
            {user.name}
          </span>
          <span className="block truncate text-[10.5px] text-ink-muted">
            {user.email}
          </span>
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div className="absolute end-0 top-full z-50 mt-1.5 w-56 rounded-md border border-line bg-surface p-1 shadow-pop">
            <Link
              href="/app/profile"
              className="flex items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink hover:bg-surface-2"
              onClick={() => setOpen(false)}
            >
              <UserCircle className="h-4 w-4" />
              {t("Profile")}
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-ink hover:bg-surface-2"
              onClick={() => {
                setOpen(false);
                onSignOut();
              }}
            >
              <LogOut className="h-4 w-4" />
              {t("Sign out")}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function NavSearchDialog({
  open,
  onOpenChange,
  links,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  links: NavLink[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return links;
    return links.filter((l) => l.label.toLowerCase().includes(needle));
  }, [links, q]);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="max-w-md">
        <SheetHeader>
          <SheetTitle>{t("Search")}</SheetTitle>
        </SheetHeader>
        <SheetBody className="space-y-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Go to…")}
            className="flex h-10 w-full rounded-sm border border-line-strong bg-surface px-3 text-sm"
          />
          <ul className="divide-y divide-line rounded-md border border-line">
            {filtered.map((l) => {
              const Icon = l.icon;
              return (
                <li key={l.href}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-start text-sm hover:bg-surface-2"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(l.href);
                    }}
                  >
                    <Icon className="h-4 w-4 text-ink-muted" />
                    {l.label}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-sm text-ink-muted">
                {t("No matches")}
              </li>
            ) : null}
          </ul>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [unread, setUnread] = useState(0);
  const [managesTeam, setManagesTeam] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
  }, [router]);

  useEffect(() => {
    void api<AuthUser>("/v1/auth/me")
      .then(async (me) => {
        updateSessionUser(me);
        setUser(me);
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
      if (u) setUser(u);
    };
    window.addEventListener("hr-session-user", sync);
    return () => window.removeEventListener("hr-session-user", sync);
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
    return groupedNavFor(user, {
      managesTeam,
      features: featuresOf(user),
    });
  }, [user, managesTeam]);

  const flatLinks = useMemo(
    () =>
      sections.flatMap((s) =>
        s.links.flatMap((l) =>
          l.children?.length
            ? [
                { href: l.href, label: l.label, icon: l.icon },
                ...l.children.map((c) => ({
                  href: c.href,
                  label: `${l.label} · ${c.label}`,
                  icon: l.icon,
                })),
              ]
            : [l],
        ),
      ),
    [sections],
  );

  const signOut = useCallback(() => {
    clearSession();
    router.push("/login");
  }, [router]);

  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-canvas p-6">
        <PageSkeleton dense className="w-full max-w-lg" />
      </div>
    );
  }

  const productName = brand.brandingName || "Elevora";
  const showUpsell = hasLockedModule(user);

  const brandHeader = (
    <Link
      href={homeHrefFor(user)}
      className="mb-5 flex items-center gap-2.5 px-2.5"
    >
      <WorkspaceMark name={productName} logoUrl={brand.logoUrl} />
      <div className="min-w-0">
        <p className="truncate text-[17px] font-bold tracking-[0.02em] text-ink">
          {productName}
        </p>
        <p className="truncate text-[11px] text-ink-muted">
          {t(ROLE_LABEL[user.role])}
        </p>
      </div>
    </Link>
  );

  const upsell =
    showUpsell ? (
      <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
        <p className="text-base font-semibold text-ink">{t("Upgrade to Scale")}</p>
        <p className="mt-1 text-xs text-ink-2">
          {t("Unlock modules locked on your plan.")}
        </p>
        <Button asChild className="mt-3 w-full" size="sm">
          <Link href="/app/billing">{t("View plans")}</Link>
        </Button>
      </div>
    ) : user.role === "super_admin" && !user.tenantId ? (
      <div className="rounded-lg border border-line bg-surface p-4 shadow-sm">
        <p className="text-base font-semibold text-ink">{t("Lab workspace")}</p>
        <p className="mt-1 text-xs text-ink-2">{t("Enter lab · all unlocked")}</p>
        <Button asChild className="mt-3 w-full" size="sm">
          <Link href="/app/features">{t("Enter lab")}</Link>
        </Button>
      </div>
    ) : undefined;

  const sidebarBody = (
    <>
      {brandHeader}
      <NavLinks
        sections={sections}
        pathname={pathname}
        unread={unread}
        onNavigate={() => setMobileNav(false)}
      />
    </>
  );

  const primaryAction =
    user.role === "super_admin" && !user.tenantId ? (
      <Button asChild size="sm" className="hidden sm:inline-flex">
        <Link href="/app/tenants">
          <Plus className="h-4 w-4" />
          {t("Provision tenant")}
        </Link>
      </Button>
    ) : user.role === "tenant_admin" ||
      (user.role === "super_admin" && user.tenantId) ? (
      <Button asChild size="sm" className="hidden sm:inline-flex">
        <Link href="/app/employees">
          <Plus className="h-4 w-4" />
          {t("Quick add")}
        </Link>
      </Button>
    ) : null;

  const shell = (
    <>
      <WorkspaceChrome user={user} onUserChange={setUser} />
      <AppFrame
        sidebar={
          <Sidebar upsell={upsell} className="h-full">
            {sidebarBody}
          </Sidebar>
        }
      >
        <Topbar
          onMenuClick={() => setMobileNav(true)}
          onSearchOpen={() => setSearchOpen(true)}
          langToggle={<LanguageToggle showLabels={false} />}
          notifications={
            <IconButton
              aria-label={t("Alerts")}
              dot={unread > 0}
              onClick={() => router.push("/app/notifications")}
            >
              <Bell className="h-4 w-4" />
            </IconButton>
          }
          userChip={<UserChipMenu user={user} onSignOut={signOut} />}
          primaryAction={primaryAction}
        />
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-20 pt-1 sm:px-4 md:px-5">
          {user.accessAllowed === false && user.role === "tenant_admin" ? (
            <div className="mb-4 flex flex-col gap-3 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="min-w-0 text-sm text-ink">
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
            <div className="mb-4 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3 text-sm">
              <p className="font-medium">{t("Subscription ended")}</p>
              <p className="mt-1 text-ink-muted">
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
        </div>
      </AppFrame>

      <Sheet open={mobileNav} onOpenChange={setMobileNav}>
        <SheetContent className="w-full max-w-[280px] p-0 sm:max-w-[280px]">
          <Sidebar
            upsell={upsell}
            className="h-full rounded-none border-0"
            onCollapse={() => setMobileNav(false)}
          >
            {sidebarBody}
          </Sidebar>
        </SheetContent>
      </Sheet>

      <NavSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        links={flatLinks}
      />
    </>
  );

  if (user.role === "super_admin" && !user.tenantId) {
    return shell;
  }

  return <ClockStatusProvider>{shell}</ClockStatusProvider>;
}
