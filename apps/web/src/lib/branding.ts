import { api, getTokens } from "@/lib/api";

export type BrandPresetId = "neutral" | "teal" | "forest" | "slate";

export type TenantBrand = {
  preset: BrandPresetId;
  brandingName: string;
  logoUrl: string | null;
};

type ServerBranding = {
  brandingName: string;
  logoUrl: string | null;
  brandPreset: BrandPresetId;
};

const STORAGE_PREFIX = "hr_tenant_brand:";

export const BRAND_PRESETS: Record<
  BrandPresetId,
  { label: string; primary: string; ring: string; accent: string }
> = {
  neutral: {
    label: "Neutral",
    primary: "222 14% 28%",
    ring: "222 14% 28%",
    accent: "220 14% 94%",
  },
  teal: {
    label: "Teal",
    primary: "199 85% 32%",
    ring: "199 85% 32%",
    accent: "173 35% 92%",
  },
  forest: {
    label: "Forest",
    primary: "152 45% 28%",
    ring: "152 45% 28%",
    accent: "148 30% 92%",
  },
  slate: {
    label: "Slate",
    primary: "215 20% 32%",
    ring: "215 20% 32%",
    accent: "210 20% 94%",
  },
};

export const DEFAULT_BRAND: TenantBrand = {
  preset: "neutral",
  brandingName: "HR Track",
  logoUrl: null,
};

function storageKey(tenantId: string) {
  return `${STORAGE_PREFIX}${tenantId}`;
}

export function hostedLogoUrl(path?: string | null): string | null {
  if (!path) return null;
  if (path.startsWith("/v1/uploads/logos/")) return path;
  return null;
}

function normalizeBrand(partial: Partial<TenantBrand> | null | undefined): TenantBrand {
  const preset =
    partial?.preset && partial.preset in BRAND_PRESETS
      ? partial.preset
      : "neutral";
  return {
    preset,
    brandingName: partial?.brandingName?.trim() || DEFAULT_BRAND.brandingName,
    logoUrl: hostedLogoUrl(partial?.logoUrl),
  };
}

function fromServer(branding: ServerBranding): TenantBrand {
  return normalizeBrand({
    preset: branding.brandPreset,
    brandingName: branding.brandingName,
    logoUrl: branding.logoUrl,
  });
}

export function loadTenantBrand(tenantId: string | null | undefined): TenantBrand {
  if (typeof window === "undefined" || !tenantId) return DEFAULT_BRAND;
  try {
    const raw = window.localStorage.getItem(storageKey(tenantId));
    if (!raw) return DEFAULT_BRAND;
    return normalizeBrand(JSON.parse(raw) as Partial<TenantBrand>);
  } catch {
    return DEFAULT_BRAND;
  }
}

export function saveTenantBrand(tenantId: string, brand: TenantBrand) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(tenantId), JSON.stringify(brand));
  window.dispatchEvent(new Event("hr-tenant-brand"));
}

/** Load branding from API when authenticated; otherwise local cache / default. */
export async function fetchTenantBrand(
  tenantId: string | null | undefined,
): Promise<TenantBrand> {
  if (!tenantId) return DEFAULT_BRAND;
  const { access } = getTokens();
  if (!access) return loadTenantBrand(tenantId);
  try {
    const res = await api<{ branding: ServerBranding }>("/v1/admin/branding");
    const brand = fromServer(res.branding);
    saveTenantBrand(tenantId, brand);
    return brand;
  } catch {
    return loadTenantBrand(tenantId);
  }
}

/** Persist branding via API and refresh local cache. */
export async function persistTenantBrand(
  tenantId: string,
  brand: TenantBrand,
): Promise<TenantBrand> {
  const res = await api<{ branding: ServerBranding }>("/v1/admin/branding", {
    method: "PATCH",
    body: JSON.stringify({
      brandingName: brand.brandingName,
      brandPreset: brand.preset,
    }),
  });
  const next = fromServer(res.branding);
  saveTenantBrand(tenantId, next);
  return next;
}

/** Upload a logo file (base64 data URL or raw base64) and refresh local cache. */
export async function persistTenantLogo(
  tenantId: string,
  imageBase64: string,
): Promise<TenantBrand> {
  const res = await api<{ branding: ServerBranding }>("/v1/admin/branding/logo", {
    method: "POST",
    body: JSON.stringify({ imageBase64 }),
  });
  const next = fromServer(res.branding);
  saveTenantBrand(tenantId, next);
  return next;
}

export async function removeTenantLogo(tenantId: string): Promise<TenantBrand> {
  const res = await api<{ branding: ServerBranding }>("/v1/admin/branding/logo", {
    method: "DELETE",
  });
  const next = fromServer(res.branding);
  saveTenantBrand(tenantId, next);
  return next;
}

export function applyBrandToDocument(brand: TenantBrand, redesignOn: boolean) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (!redesignOn) {
    root.removeAttribute("data-ui-redesign");
    root.removeAttribute("data-brand");
    root.style.removeProperty("--primary");
    root.style.removeProperty("--ring");
    root.style.removeProperty("--accent");
    root.style.removeProperty("--accent-foreground");
    return;
  }
  root.dataset.uiRedesign = "1";
  root.dataset.brand = brand.preset;
  const preset = BRAND_PRESETS[brand.preset];
  root.style.setProperty("--primary", preset.primary);
  root.style.setProperty("--ring", preset.ring);
  root.style.setProperty("--accent", preset.accent);
  if (brand.preset === "neutral" || brand.preset === "slate") {
    root.style.setProperty("--accent-foreground", "222 14% 18%");
  } else if (brand.preset === "forest") {
    root.style.setProperty("--accent-foreground", "152 50% 18%");
  } else {
    root.style.setProperty("--accent-foreground", "175 50% 22%");
  }
}
