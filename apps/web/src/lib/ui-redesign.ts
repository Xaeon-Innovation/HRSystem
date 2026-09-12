import type { AuthUser } from "@/lib/api";

const STORAGE_KEY = "hr_ui_redesign";

/** Explicit off only when env is `"0"`. Unset / `"1"` / anything else → on. */
function envDisabled(): boolean {
  return process.env.NEXT_PUBLIC_UI_REDESIGN === "0";
}

function tenantAllowlist(): string[] {
  const raw = process.env.NEXT_PUBLIC_UI_REDESIGN_TENANTS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Session override for demos: localStorage hr_ui_redesign = "1" | "0". */
export function getUiRedesignOverride(): boolean | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(STORAGE_KEY);
  if (v === "1") return true;
  if (v === "0") return false;
  return null;
}

export function setUiRedesignOverride(on: boolean | null) {
  if (typeof window === "undefined") return;
  if (on === null) window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, on ? "1" : "0");
  window.dispatchEvent(new Event("hr-ui-redesign"));
}

/**
 * New UI is on by default when:
 * - localStorage override is `"1"`, or
 * - no override and env is not `"0"`, and (no tenant allowlist, or user's tenant is listed).
 *
 * Off when localStorage override is `"0"`, or env is `"0"`.
 * When env is `"1"` (or unset / anything-but-0) with an allowlist, only listed tenants see the redesign.
 */
export function isUiRedesignEnabled(user?: AuthUser | null): boolean {
  const override = getUiRedesignOverride();
  if (override !== null) return override;
  if (envDisabled()) return false;
  const allow = tenantAllowlist();
  if (allow.length === 0) return true;
  if (!user?.tenantId) return false;
  return allow.includes(user.tenantId);
}
