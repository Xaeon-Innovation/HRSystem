"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getTokens, getUser } from "@/lib/api";
import {
  applyBrandToDocument,
  DEFAULT_BRAND,
  fetchTenantBrand,
  loadTenantBrand,
  type TenantBrand,
} from "@/lib/branding";
import { isUiRedesignEnabled } from "@/lib/ui-redesign";

const BrandContext = createContext<TenantBrand>(DEFAULT_BRAND);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<TenantBrand>(DEFAULT_BRAND);

  useEffect(() => {
    let cancelled = false;

    const paint = (next: TenantBrand, on: boolean) => {
      if (cancelled) return;
      applyBrandToDocument(on ? next : DEFAULT_BRAND, on);
      setBrand(on ? next : DEFAULT_BRAND);
    };

    /** Local cache only — used after save / cache write (avoids refetch loops). */
    const applyLocal = () => {
      const user = getUser();
      const on = isUiRedesignEnabled(user);
      if (!on) {
        paint(DEFAULT_BRAND, false);
        return;
      }
      paint(loadTenantBrand(user?.tenantId), true);
    };

    /** Local first, then server when logged in. */
    const syncFromServer = () => {
      const user = getUser();
      const on = isUiRedesignEnabled(user);
      if (!on) {
        paint(DEFAULT_BRAND, false);
        return;
      }
      paint(loadTenantBrand(user?.tenantId), true);
      const { access } = getTokens();
      if (!access || !user?.tenantId) return;
      void fetchTenantBrand(user.tenantId).then((next) => {
        if (cancelled) return;
        paint(next, isUiRedesignEnabled(getUser()));
      });
    };

    syncFromServer();
    window.addEventListener("hr-tenant-brand", applyLocal);
    window.addEventListener("hr-ui-redesign", syncFromServer);
    window.addEventListener("hr-session-user", syncFromServer);
    return () => {
      cancelled = true;
      window.removeEventListener("hr-tenant-brand", applyLocal);
      window.removeEventListener("hr-ui-redesign", syncFromServer);
      window.removeEventListener("hr-session-user", syncFromServer);
    };
  }, []);

  return (
    <BrandContext.Provider value={brand}>{children}</BrandContext.Provider>
  );
}

export function useTenantBrand() {
  return useContext(BrandContext);
}
