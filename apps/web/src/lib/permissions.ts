import { hasSystemModuleRole, type PlanFeatureKey, type SystemModuleRole } from "@hr/shared";
import type { AuthUser } from "@/lib/api";

export function userHasModule(
  user: AuthUser | null | undefined,
  module: SystemModuleRole,
): boolean {
  return hasSystemModuleRole(user, module);
}

export function isFullTenantAdmin(user: AuthUser | null | undefined): boolean {
  return user?.role === "tenant_admin" || user?.role === "super_admin";
}

/** Super admins bypass plan gates; missing features default to locked. */
export function planHasFeature(
  user: AuthUser | null | undefined,
  feature: PlanFeatureKey,
): boolean {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return user.planFeatures?.[feature] === true;
}
