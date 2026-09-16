"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUser, type AuthUser } from "@/lib/api";
import { PageSkeleton } from "@/components/ui/page-skeleton";

const PLATFORM_PREFIXES = [
  "/app/tenants",
  "/app/plans",
  "/app/features",
  "/app/subscriptions",
  "/app/audits",
  "/app/health",
  "/app/leads",
  "/app/payments",
];

const TENANT_ONLY_PREFIXES = [
  "/app/employees",
  "/app/attendance",
  "/app/map",
  "/app/team",
  "/app/clock",
  "/app/kpis",
  "/app/leave",
  "/app/hiring",
  "/app/compensation",
  "/app/integrations",
  "/app/analytics",
  "/app/billing",
  "/app/notifications",
  "/app/settings",
];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function homeFor(user: AuthUser) {
  if (user.role === "super_admin") return "/app";
  if (user.role === "tenant_admin") return "/app";
  return "/app/clock";
}

export function isSuperAdminInTenant(user: AuthUser | null | undefined) {
  return user?.role === "super_admin" && Boolean(user.tenantId);
}

/**
 * Client-side role gate for platform vs tenant routes.
 * Super admin with an entered tenantId may use tenant product routes.
 */
export function usePlatformRoleGate() {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const user = getUser();
    if (!user) {
      setReady(true);
      return;
    }

    if (user.role === "super_admin") {
      if (user.tenantId) {
        setReady(true);
        return;
      }
      if (pathname === "/app") {
        setReady(true);
        return;
      }
      if (matchesPrefix(pathname, TENANT_ONLY_PREFIXES)) {
        router.replace("/app/tenants");
        return;
      }
      setReady(true);
      return;
    }

    if (matchesPrefix(pathname, PLATFORM_PREFIXES)) {
      router.replace(homeFor(user));
      return;
    }
    setReady(true);
  }, [pathname, router]);

  return ready;
}

export function PlatformRoleGate({ children }: { children: React.ReactNode }) {
  const ready = usePlatformRoleGate();
  if (!ready) return <PageSkeleton />;
  return <>{children}</>;
}
