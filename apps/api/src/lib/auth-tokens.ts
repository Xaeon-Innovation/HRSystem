import { createSigner, createVerifier } from "fast-jwt";
import {
  normalizeSystemModuleRoles,
  type JwtPayload,
  type SystemModuleRole,
} from "@hr/shared";
import { avatarUrlFor } from "./avatar.js";
import type { App } from "../types.js";
import { users } from "@hr/db";

type UserRow = typeof users.$inferSelect;

export type RefreshJwtPayload = JwtPayload & { typ: "refresh" };

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
  const signRefresh = createSigner({
    key: app.env.jwtRefreshSecret,
    expiresIn: 60 * 60 * 24 * 7,
  });
  const refreshToken = signRefresh({ ...payload, typ: "refresh" });
  return { accessToken, refreshToken };
}

export function verifyRefreshToken(
  app: App,
  refreshToken: string,
): RefreshJwtPayload {
  const verify = createVerifier({ key: app.env.jwtRefreshSecret });
  const payload = verify(refreshToken) as RefreshJwtPayload;
  if (payload.typ !== "refresh") {
    throw new Error("Invalid refresh token type");
  }
  return payload;
}
