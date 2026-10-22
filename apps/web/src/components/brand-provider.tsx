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

const BrandContext = createContext<TenantBrand>(DEFAULT_BRAND);

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [brand, setBrand] = useState<TenantBrand>(DEFAULT_BRAND);

  useEffect(() => {
    let cancelled = false;

    const paint = (next: TenantBrand) => {
      if (cancelled) return;
      applyBrandToDocument(next);
      setBrand(next);
    };

    const applyLocal = () => {
      const user = getUser();
      paint(loadTenantBrand(user?.tenantId));
    };

    const syncFromServer = () => {
      const user = getUser();
      paint(loadTenantBrand(user?.tenantId));
      const { access } = getTokens();
      if (!access || !user?.tenantId) return;
      void fetchTenantBrand(user.tenantId).then((next) => {
        if (cancelled) return;
        paint(next);
      });
    };

    syncFromServer();
    window.addEventListener("hr-tenant-brand", applyLocal);
    window.addEventListener("hr-session-user", syncFromServer);

    return () => {
      cancelled = true;
      window.removeEventListener("hr-tenant-brand", applyLocal);
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
