import type { AuthUser } from "@/lib/api";

/**
 * Redesign is always on. Kept for any leftover callers / env checks.
 */
export function getUiRedesignOverride(): boolean | null {
  return null;
}

export function setUiRedesignOverride(_on: boolean | null) {
  /* no-op */
}

export function isUiRedesignEnabled(_user?: AuthUser | null): boolean {
  return true;
}
