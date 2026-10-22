import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import {
  employees,
  mobileDevices,
  mobileRefreshTokens,
  tenants,
  users,
} from "@hr/db";
import type {
  MobileDevice,
  MobileLoginRequest,
  MobileMe,
} from "@hr/shared";
import { logoUrlFor } from "../lib/avatar.js";
import {
  moduleRolesOf,
  signTokens,
  toAuthUser,
} from "../lib/auth-tokens.js";
import {
  getTenantPlanFeatures,
  planFeatureEnabled,
} from "../lib/features.js";
import type { App } from "../types.js";

const REFRESH_TTL_MS = 60 * 60 * 24 * 60 * 1000; // 60 days

export type AccentPreset = "lime" | "teal" | "emerald" | "violet";

export function accentFromTenantSettings(
  settings: { brandPreset?: string } | null | undefined,
): AccentPreset {
  switch (settings?.brandPreset) {
    case "teal":
      return "teal";
    case "forest":
      return "emerald";
    default:
      return "lime";
  }
}

export function hashRefreshToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function newRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export async function lookupWorkspace(app: App, slug: string) {
  const tenant = await app.db.query.tenants.findFirst({
    where: eq(tenants.slug, slug),
  });
  if (!tenant || tenant.status === "deleted") return null;
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.settings.brandingName?.trim() || tenant.name,
    logoUrl: logoUrlFor(tenant.id, tenant.logoMime, tenant.updatedAt),
    accentPreset: accentFromTenantSettings(tenant.settings),
    status: tenant.status === "active" ? ("active" as const) : ("suspended" as const),
    signInMethods: ["password"] as ("password")[],
  };
}

export async function buildMobileMe(
  app: App,
  userId: string,
  tenantId: string,
): Promise<MobileMe | null> {
  const user = await app.db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  if (!user) return null;

  const tenant = await app.db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });
  if (!tenant) return null;

  const emp = await app.db.query.employees.findFirst({
    where: and(eq(employees.userId, user.id), eq(employees.tenantId, tenantId)),
  });

  const features = await getTenantPlanFeatures(app.db, tenantId);
  const reports = emp
    ? await app.db.query.employees.findMany({
        where: and(
          eq(employees.tenantId, tenantId),
          eq(employees.managerId, emp.id),
          eq(employees.status, "active"),
        ),
        columns: { id: true },
      })
    : [];

  const zones =
    emp?.geofenceLat != null &&
    emp?.geofenceLng != null &&
    emp?.geofenceRadiusMeters != null
      ? [
          {
            id: `employee:${emp.id}`,
            lat: emp.geofenceLat,
            lng: emp.geofenceLng,
            radiusMeters: emp.geofenceRadiusMeters,
            label: "Work zone",
          },
        ]
      : [];

  const authUser = toAuthUser(user, emp?.id ?? null);

  return {
    user: {
      id: authUser.id,
      email: authUser.email,
      name: authUser.name,
      avatarUrl: authUser.avatarUrl,
      employeeId: authUser.employeeId,
    },
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.settings.brandingName?.trim() || tenant.name,
      logoUrl: logoUrlFor(tenant.id, tenant.logoMime, tenant.updatedAt),
      accentPreset: accentFromTenantSettings(tenant.settings),
      timezone: tenant.settings.timezone ?? "UTC",
    },
    role: user.role,
    moduleRoles: moduleRolesOf(user),
    presenceMode: emp?.presenceMode ?? "fixed_zone",
    zones,
    entitlements: {
      fieldOps:
        planFeatureEnabled(features, "liveMap") ||
        planFeatureEnabled(features, "teamToday"),
      liveMap: planFeatureEnabled(features, "liveMap"),
      teamToday: planFeatureEnabled(features, "teamToday"),
      leave: planFeatureEnabled(features, "leave"),
      tasks: planFeatureEnabled(features, "tasks"),
      kpis: planFeatureEnabled(features, "kpis"),
    },
    locale: "en",
    theme: "system",
    managerOf: reports.length,
    mustChangePassword: user.mustChangePassword,
  };
}

async function issueOpaqueRefresh(
  app: App,
  deviceId: string,
): Promise<{ id: string; raw: string; expiresAt: Date }> {
  const raw = newRefreshToken();
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  const [row] = await app.db
    .insert(mobileRefreshTokens)
    .values({
      deviceId,
      tokenHash: hashRefreshToken(raw),
      expiresAt,
    })
    .returning({ id: mobileRefreshTokens.id });
  return { id: row.id, raw, expiresAt };
}

export async function mobileLogin(
  app: App,
  body: MobileLoginRequest,
): Promise<
  | {
      ok: true;
      accessToken: string;
      refreshToken: string;
      mustChangePassword: boolean;
      me: MobileMe;
    }
  | { ok: false; status: number; error: string }
> {
  const workspace = await lookupWorkspace(app, body.slug);
  if (!workspace) {
    return { ok: false, status: 401, error: "Invalid credentials" };
  }
  if (workspace.status === "suspended") {
    return {
      ok: false,
      status: 403,
      error: "This workspace is suspended. Contact your admin.",
    };
  }

  const user = await app.db.query.users.findFirst({
    where: and(
      eq(users.email, body.email.toLowerCase()),
      eq(users.tenantId, workspace.id),
    ),
  });
  if (!user) {
    return { ok: false, status: 401, error: "Invalid credentials" };
  }

  const match = await bcrypt.compare(body.password, user.passwordHash);
  if (!match) {
    return { ok: false, status: 401, error: "Invalid credentials" };
  }

  const emp = await app.db.query.employees.findFirst({
    where: and(
      eq(employees.userId, user.id),
      eq(employees.tenantId, workspace.id),
    ),
  });

  await upsertDevice(app, {
    device: body.device,
    tenantId: workspace.id,
    userId: user.id,
  });

  // Revoke prior refresh rows for this device, then issue a fresh one.
  await app.db
    .update(mobileRefreshTokens)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(mobileRefreshTokens.deviceId, body.device.id),
        isNull(mobileRefreshTokens.revokedAt),
      ),
    );

  const { raw: refreshToken } = await issueOpaqueRefresh(app, body.device.id);
  const { accessToken } = signTokens(app, {
    sub: user.id,
    role: user.role,
    tenantId: workspace.id,
    employeeId: emp?.id ?? null,
    systemModuleRoles: moduleRolesOf(user),
  });

  const me = await buildMobileMe(app, user.id, workspace.id);
  if (!me) {
    return { ok: false, status: 500, error: "Failed to build profile" };
  }

  return {
    ok: true,
    accessToken,
    refreshToken,
    mustChangePassword: user.mustChangePassword,
    me,
  };
}

async function upsertDevice(
  app: App,
  input: { device: MobileDevice; tenantId: string; userId: string },
) {
  const existing = await app.db.query.mobileDevices.findFirst({
    where: eq(mobileDevices.id, input.device.id),
  });
  const now = new Date();
  if (existing) {
    if (existing.userId !== input.userId || existing.revokedAt) {
      // Re-bind device to this user after revoke / ownership change.
      await app.db
        .update(mobileDevices)
        .set({
          tenantId: input.tenantId,
          userId: input.userId,
          platform: input.device.platform,
          model: input.device.model ?? null,
          appVersion: input.device.appVersion ?? null,
          lastSeenAt: now,
          revokedAt: null,
        })
        .where(eq(mobileDevices.id, input.device.id));
      return;
    }
    await app.db
      .update(mobileDevices)
      .set({
        platform: input.device.platform,
        model: input.device.model ?? null,
        appVersion: input.device.appVersion ?? null,
        lastSeenAt: now,
      })
      .where(eq(mobileDevices.id, input.device.id));
    return;
  }
  await app.db.insert(mobileDevices).values({
    id: input.device.id,
    tenantId: input.tenantId,
    userId: input.userId,
    platform: input.device.platform,
    model: input.device.model ?? null,
    appVersion: input.device.appVersion ?? null,
    lastSeenAt: now,
  });
}

export async function mobileRefresh(
  app: App,
  input: { refreshToken: string; deviceId: string },
): Promise<
  | { ok: true; accessToken: string; refreshToken: string }
  | { ok: false; status: number; error: string }
> {
  const hash = hashRefreshToken(input.refreshToken);
  const row = await app.db.query.mobileRefreshTokens.findFirst({
    where: eq(mobileRefreshTokens.tokenHash, hash),
  });
  if (!row || row.deviceId !== input.deviceId) {
    return { ok: false, status: 401, error: "Invalid refresh token" };
  }

  // Theft detection: presenting a token that was already rotated.
  if (row.replacedBy || row.revokedAt) {
    await revokeDevice(app, input.deviceId);
    return { ok: false, status: 401, error: "Session revoked" };
  }

  if (row.expiresAt.getTime() < Date.now()) {
    await app.db
      .update(mobileRefreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(mobileRefreshTokens.id, row.id));
    return { ok: false, status: 401, error: "Refresh token expired" };
  }

  const device = await app.db.query.mobileDevices.findFirst({
    where: eq(mobileDevices.id, input.deviceId),
  });
  if (!device || device.revokedAt) {
    return { ok: false, status: 401, error: "Device revoked" };
  }

  const user = await app.db.query.users.findFirst({
    where: eq(users.id, device.userId),
  });
  if (!user) {
    return { ok: false, status: 401, error: "Invalid refresh token" };
  }

  const emp = await app.db.query.employees.findFirst({
    where: and(
      eq(employees.userId, user.id),
      eq(employees.tenantId, device.tenantId),
    ),
  });

  const next = await issueOpaqueRefresh(app, device.id);

  await app.db
    .update(mobileRefreshTokens)
    .set({
      replacedBy: next.id,
      revokedAt: new Date(),
    })
    .where(eq(mobileRefreshTokens.id, row.id));

  await app.db
    .update(mobileDevices)
    .set({ lastSeenAt: new Date() })
    .where(eq(mobileDevices.id, device.id));

  const { accessToken } = signTokens(app, {
    sub: user.id,
    role: user.role,
    tenantId: device.tenantId,
    employeeId: emp?.id ?? null,
    systemModuleRoles: moduleRolesOf(user),
  });

  return { ok: true, accessToken, refreshToken: next.raw };
}

export async function revokeDevice(app: App, deviceId: string) {
  const now = new Date();
  await app.db
    .update(mobileDevices)
    .set({ revokedAt: now })
    .where(eq(mobileDevices.id, deviceId));
  await app.db
    .update(mobileRefreshTokens)
    .set({ revokedAt: now })
    .where(
      and(
        eq(mobileRefreshTokens.deviceId, deviceId),
        isNull(mobileRefreshTokens.revokedAt),
      ),
    );
}

export async function mobileLogout(
  app: App,
  input: { deviceId: string; refreshToken?: string },
) {
  if (input.refreshToken) {
    const hash = hashRefreshToken(input.refreshToken);
    await app.db
      .update(mobileRefreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(mobileRefreshTokens.tokenHash, hash));
  }
  await revokeDevice(app, input.deviceId);
}

export async function mobileChangePassword(
  app: App,
  input: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  },
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const user = await app.db.query.users.findFirst({
    where: eq(users.id, input.userId),
  });
  if (!user) {
    return { ok: false, status: 404, error: "Not found" };
  }
  const match = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!match) {
    return { ok: false, status: 401, error: "Current password is incorrect" };
  }
  const passwordHash = await bcrypt.hash(input.newPassword, 10);
  await app.db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, user.id));
  return { ok: true };
}
