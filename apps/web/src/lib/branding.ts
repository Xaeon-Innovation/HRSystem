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

/** Maps stored presets onto CSS data-accent values. neutral = default lime (no attr). */
export const PRESET_TO_ACCENT: Record<BrandPresetId, string | null> = {
  neutral: null,
  teal: "teal",
  forest: "emerald",
  slate: "slate",
};

export const BRAND_PRESETS: Record<
  BrandPresetId,
  { label: string; swatch: string }
> = {
  neutral: { label: "Lime", swatch: "80 61% 50%" },
  teal: { label: "Teal", swatch: "192 70% 46%" },
  forest: { label: "Emerald", swatch: "160 84% 39%" },
  slate: { label: "Slate", swatch: "215 16% 47%" },
};

export const DEFAULT_BRAND: TenantBrand = {
  preset: "neutral",
  brandingName: "Polara",
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

/**
 * Apply tenant accent via data-accent. Does not paint --primary (ink buttons).
 * @param _redesignOn kept for call-site compatibility; branding always applies.
 */
export function applyBrandToDocument(brand: TenantBrand, _redesignOn = true) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.dataset.brand = brand.preset;

  const accent = PRESET_TO_ACCENT[brand.preset];
  if (accent) {
    root.dataset.accent = accent;
  } else {
    root.removeAttribute("data-accent");
  }

  // Clear any leftover inline brand overrides from the previous design.
  root.style.removeProperty("--primary");
  root.style.removeProperty("--primary-foreground");
  root.style.removeProperty("--ring");
  root.style.removeProperty("--accent");
  root.style.removeProperty("--accent-foreground");
  root.style.removeProperty("--card-title");
  root.removeAttribute("data-ui-redesign");
}
