"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { moduleForPath, type ModuleKey } from "@hr/shared";
import { api, getUser, type AuthUser } from "@/lib/api";
import { planHasFeature } from "@/lib/permissions";
import { t } from "@/i18n";

const PLATFORM_PREFIXES = [
  "/app/tenants",
  "/app/subscriptions",
  "/app/leads",
  "/app/plans",
  "/app/features",
  "/app/payments",
  "/app/audits",
];

/**
 * Soft client gate for module routes. Deep links to disabled modules
 * redirect to dashboard with an in-app message (API remains authoritative).
 */
export function FeatureGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [blocked, setBlocked] = useState<ModuleKey | null>(null);

  useEffect(() => {
    setUser(getUser());
    void api<AuthUser>("/v1/auth/me")
      .then((me) => setUser(me))
      .catch(() => undefined);
  }, [pathname]);

  const moduleKey = useMemo(() => moduleForPath(pathname), [pathname]);

  const isPlatformRoute =
    user?.role === "super_admin" &&
    !user.tenantId &&
    (pathname === "/app" ||
      PLATFORM_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      ));

  useEffect(() => {
    if (!user || !moduleKey || isPlatformRoute) {
      setBlocked(null);
      return;
    }
    if (user.role === "super_admin" && !user.tenantId) {
      setBlocked(null);
      return;
    }
    if (!planHasFeature(user, moduleKey)) {
      setBlocked(moduleKey);
      if (pathname !== "/app") {
        router.replace(`/app?feature_locked=${moduleKey}`);
      }
    } else {
      setBlocked(null);
    }
  }, [user, moduleKey, router, pathname, isPlatformRoute]);

  if (blocked) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("This module is not included in the current plan.")}
      </p>
    );
  }

  return <>{children}</>;
}
