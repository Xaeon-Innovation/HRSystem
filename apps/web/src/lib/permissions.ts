import {
  hasSystemModuleRole,
  type ModuleKey,
  type PlanFeatureKey,
  type SystemModuleRole,
} from "@hr/shared";
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

export function workspaceUnlocksAll(user: AuthUser | null | undefined): boolean {
  if (!user || user.role !== "super_admin") return false;
  // No workspace mode on JWT = legacy unlock; explicit unlock_all; or not in a tenant
  if (!user.tenantId) return true;
  const mode = user.workspace?.mode;
  return !mode || mode === "unlock_all";
}

/** Super admins unlock when mode is unlock_all; otherwise use planFeatures. */
export function planHasFeature(
  user: AuthUser | null | undefined,
  feature: PlanFeatureKey | ModuleKey,
): boolean {
  if (!user) return false;
  if (workspaceUnlocksAll(user)) return true;
  return user.planFeatures?.[feature] === true;
}
