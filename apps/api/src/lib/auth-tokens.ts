import {
  normalizeSystemModuleRoles,
  type JwtPayload,
  type SystemModuleRole,
} from "@hr/shared";
import { avatarUrlFor } from "./avatar.js";
import type { App } from "../types.js";
import { users } from "@hr/db";

type UserRow = typeof users.$inferSelect;

export function moduleRolesOf(
  user: Pick<UserRow, "role" | "systemModuleRoles">,
): SystemModuleRole[] {
  if (user.role === "tenant_admin" || user.role === "super_admin") return [];
  return normalizeSystemModuleRoles(
    Array.isArray(user.systemModuleRoles) ? user.systemModuleRoles : [],
  );
}

export function toAuthUser(
  user: Pick<
    UserRow,
    | "id"
    | "email"
    | "name"
    | "role"
    | "tenantId"
    | "avatarMime"
    | "updatedAt"
    | "systemModuleRoles"
  >,
  employeeId: string | null,
) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
    employeeId,
    systemModuleRoles: moduleRolesOf(user),
    avatarUrl: avatarUrlFor(user.id, user.avatarMime, user.updatedAt),
  };
}

export function toJwtPayload(
  user: Pick<UserRow, "id" | "role" | "tenantId" | "systemModuleRoles">,
  employeeId: string | null,
): JwtPayload {
  return {
    sub: user.id,
    role: user.role,
    tenantId: user.tenantId,
    employeeId,
    systemModuleRoles: moduleRolesOf(user),
  };
}

export function signTokens(app: App, payload: JwtPayload) {
  const accessToken = app.jwt.sign(payload, { expiresIn: "15m" });
  const refreshToken = app.jwt.sign(payload, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}
