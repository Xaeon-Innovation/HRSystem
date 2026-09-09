import { hasSystemModuleRole, type SystemModuleRole } from "@hr/shared";
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
