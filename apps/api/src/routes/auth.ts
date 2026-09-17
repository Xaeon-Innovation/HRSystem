import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { employees, plans, tenants, users } from "@hr/db";
import {
  loginSchema,
  refreshSchema,
  uploadAvatarSchema,
  type JwtPayload,
  type WorkspaceMode,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { decodeBase64Image, detectImageMime } from "../lib/avatar.js";
import {
  signTokens,
  toAuthUser,
  toJwtPayload,
  moduleRolesOf,
  verifyRefreshToken,
} from "../lib/auth-tokens.js";
import { getTenantSubscription, subscriptionAllowsAccess } from "../lib/billing.js";
import {
  getTenantPlanFeatures,
  resolvePingIntervalSec,
} from "../lib/features.js";
import { loginGuard } from "../lib/login-guard.js";
import { authenticate } from "../types.js";

async function auditLoginFailure(
  app: Parameters<typeof writeAudit>[0],
  request: Parameters<typeof writeAudit>[1]["request"],
  input: {
    email: string;
    tenantSlug?: string | null;
    tenantId?: string | null;
    reason: string;
    locked?: boolean;
  },
) {
  await writeAudit(app, {
    action: "auth.login.failure",
    tenantId: input.tenantId ?? null,
    resourceType: "user",
    metadata: {
      email: input.email,
      tenantSlug: input.tenantSlug ?? null,
      reason: input.reason,
      locked: input.locked ?? false,
    },
    request,
  });
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/login",
    {
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
    },
    async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password, tenantSlug } = parsed.data;

    if (loginGuard.isLocked(email, tenantSlug)) {
      const retryAfterSec = Math.ceil(
        loginGuard.remainingLockMs(email, tenantSlug) / 1000,
      );
      await auditLoginFailure(app, request, {
        email,
        tenantSlug,
        reason: "locked",
        locked: true,
      });
      reply.header("retry-after", String(retryAfterSec));
      return reply.code(429).send({
        error: "Too many failed sign-in attempts. Try again later.",
        retryAfterSec,
      });
    }

    let tenantId: string | null = null;
    if (tenantSlug) {
      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.slug, tenantSlug),
      });
      if (!tenant || tenant.status !== "active") {
        const { locked } = loginGuard.recordFailure(email, tenantSlug);
        await auditLoginFailure(app, request, {
          email,
          tenantSlug,
          reason: "invalid_tenant",
          locked,
        });
        return reply.code(401).send({ error: "Invalid credentials" });
      }
      tenantId = tenant.id;
    }

    const user = await app.db.query.users.findFirst({
      where:
        tenantId === null
          ? and(eq(users.email, email), isNull(users.tenantId))
          : and(eq(users.email, email), eq(users.tenantId, tenantId)),
    });

    // Also allow login without slug if email uniquely matches a tenant user
    let resolved = user;
    if (!resolved && !tenantSlug) {
      const matches = await app.db.query.users.findMany({
        where: eq(users.email, email),
      });
      if (matches.length === 1) resolved = matches[0];
      else if (matches.length > 1) {
        return reply
          .code(400)
          .send({ error: "tenantSlug required for this account" });
      }
    }

    if (!resolved) {
      const { locked } = loginGuard.recordFailure(email, tenantSlug);
      await auditLoginFailure(app, request, {
        email,
        tenantSlug,
        tenantId,
        reason: "unknown_user",
        locked,
      });
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, resolved.passwordHash);
    if (!ok) {
      const { locked } = loginGuard.recordFailure(email, tenantSlug);
      await auditLoginFailure(app, request, {
        email,
        tenantSlug,
        tenantId: resolved.tenantId,
        reason: "bad_password",
        locked,
      });
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const superOnly =
      process.env.PLATFORM_LOGIN_SUPER_ADMIN_ONLY === "1" ||
      process.env.PLATFORM_LOGIN_SUPER_ADMIN_ONLY === "true";
    if (superOnly && resolved.role !== "super_admin") {
      return reply.code(403).send({
        error:
          "Access is limited to platform administrators while Elevora is in test mode",
      });
    }

    if (resolved.role !== "super_admin") {
      if (!resolved.tenantId) {
        return reply.code(401).send({ error: "Invalid credentials" });
      }
      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, resolved.tenantId),
      });
      if (!tenant || tenant.status !== "active") {
        return reply.code(403).send({ error: "Tenant suspended" });
      }
    }

    let employeeId: string | null = null;
    if (resolved.tenantId) {
      const emp = await app.db.query.employees.findFirst({
        where: and(
          eq(employees.userId, resolved.id),
          eq(employees.tenantId, resolved.tenantId),
        ),
      });
      employeeId = emp?.id ?? null;
    }

    loginGuard.clear(email, tenantSlug);
    const payload = toJwtPayload(resolved, employeeId);
    const tokens = signTokens(app, payload);

    if (resolved.role === "super_admin" || resolved.role === "tenant_admin") {
      await writeAudit(app, {
        actor: payload,
        action: "auth.login",
        tenantId: resolved.tenantId,
        resourceType: "user",
        resourceId: resolved.id,
        metadata: { email: resolved.email },
        request,
      });
    }

    return {
      ...tokens,
      user: toAuthUser(resolved, employeeId),
    };
  });

  app.post("/refresh", async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    try {
      const payload = verifyRefreshToken(app, parsed.data.refreshToken);
      const user = await app.db.query.users.findFirst({
        where: eq(users.id, payload.sub),
      });
      if (!user) return reply.code(401).send({ error: "Invalid refresh token" });

      const effectiveTenantId =
        user.role === "super_admin"
          ? (payload.tenantId ?? null)
          : user.tenantId;

      let employeeId: string | null = payload.employeeId ?? null;
      if (effectiveTenantId && user.role !== "super_admin") {
        const emp = await app.db.query.employees.findFirst({
          where: and(
            eq(employees.userId, user.id),
            eq(employees.tenantId, effectiveTenantId),
          ),
        });
        employeeId = emp?.id ?? null;
      } else if (user.role === "super_admin") {
        employeeId = null;
      }

      return signTokens(app, {
        sub: user.id,
        role: user.role,
        tenantId: effectiveTenantId,
        employeeId,
        systemModuleRoles: moduleRolesOf(user),
        workspaceMode:
          user.role === "super_admin" ? payload.workspaceMode : undefined,
        previewPlanId:
          user.role === "super_admin" ? (payload.previewPlanId ?? null) : null,
      });
    } catch {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }
  });

  app.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const user = await app.db.query.users.findFirst({
      where: eq(users.id, payload.sub),
      columns: {
        id: true,
        email: true,
        name: true,
        role: true,
        tenantId: true,
        avatarMime: true,
        updatedAt: true,
        systemModuleRoles: true,
      },
    });
    if (!user) return reply.code(404).send({ error: "Not found" });

    const effectiveTenantId =
      user.role === "super_admin"
        ? (payload.tenantId ?? null)
        : user.tenantId;

    let employeeId: string | null = payload.employeeId ?? null;
    if (effectiveTenantId && user.role !== "super_admin") {
      const emp = await app.db.query.employees.findFirst({
        where: and(
          eq(employees.userId, user.id),
          eq(employees.tenantId, effectiveTenantId),
        ),
      });
      employeeId = emp?.id ?? null;
    } else if (user.role === "super_admin") {
      employeeId = null;
    }

    const authUser = {
      ...toAuthUser(user, employeeId),
      tenantId: effectiveTenantId,
    };
    if (!effectiveTenantId) return authUser;

    const current = await getTenantSubscription(app.db, effectiveTenantId);
    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, effectiveTenantId),
      columns: { settings: true, name: true, slug: true },
    });
    const workspace =
      user.role === "super_admin"
        ? {
            mode: (payload.workspaceMode ?? "unlock_all") as WorkspaceMode,
            previewPlanId: payload.previewPlanId ?? null,
            isPlatformLab: tenant?.settings.platformLab === true,
          }
        : null;
    const featuresFinal = await getTenantPlanFeatures(
      app.db,
      effectiveTenantId,
      workspace,
    );
    const accessAllowed =
      user.role === "super_admin"
        ? true
        : subscriptionAllowsAccess(current?.subscription ?? null);

    let previewPlan: { id: string; code: string; name: string } | null = null;
    if (workspace?.mode === "preview_plan" && workspace.previewPlanId) {
      const plan = await app.db.query.plans.findFirst({
        where: eq(plans.id, workspace.previewPlanId),
      });
      if (plan) {
        previewPlan = { id: plan.id, code: plan.code, name: plan.name };
      }
    }

    return {
      ...authUser,
      plan: current?.plan
        ? {
            code: current.plan.code,
            name: current.plan.name,
            seatLimit: current.plan.seatLimit,
          }
        : null,
      planFeatures: featuresFinal,
      accessAllowed,
      subscriptionStatus: current?.subscription?.status ?? null,
      trialEndsAt: current?.subscription?.trialEndsAt?.toISOString() ?? null,
      pingIntervalSec: resolvePingIntervalSec(
        tenant?.settings.pingIntervalSec,
        featuresFinal,
      ),
      ...(user.role === "super_admin" && workspace
        ? {
            workspace: {
              mode: workspace.mode,
              previewPlanId: previewPlan?.id ?? null,
              previewPlanCode: previewPlan?.code ?? null,
              previewPlanName: previewPlan?.name ?? null,
              platformLab: tenant?.settings.platformLab === true,
              tenantSlug: tenant?.slug ?? null,
              tenantName: tenant?.name ?? null,
            },
          }
        : {}),
    };
  });

  app.post("/me/avatar", { preHandler: authenticate }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const parsed = uploadAvatarSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    let buf: Buffer;
    try {
      buf = decodeBase64Image(parsed.data.imageBase64);
    } catch (err) {
      return reply
        .code(400)
        .send({ error: err instanceof Error ? err.message : "Invalid image" });
    }
    const mime = detectImageMime(buf);
    if (!mime) {
      return reply
        .code(400)
        .send({ error: "Use a JPEG, PNG, WebP, or GIF image" });
    }

    const [updated] = await app.db
      .update(users)
      .set({
        avatarMime: mime,
        avatarBytes: buf.toString("base64"),
        updatedAt: new Date(),
      })
      .where(eq(users.id, payload.sub))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        tenantId: users.tenantId,
        avatarMime: users.avatarMime,
        updatedAt: users.updatedAt,
        systemModuleRoles: users.systemModuleRoles,
      });
    if (!updated) return reply.code(404).send({ error: "Not found" });

    await writeAudit(app, {
      actor: payload,
      action: "user.avatar.update",
      tenantId: payload.tenantId,
      resourceType: "user",
      resourceId: updated.id,
      request,
    });

    return { user: toAuthUser(updated, payload.employeeId ?? null) };
  });

  app.delete("/me/avatar", { preHandler: authenticate }, async (request, reply) => {
    const payload = request.user as JwtPayload;
    const [updated] = await app.db
      .update(users)
      .set({
        avatarMime: null,
        avatarBytes: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, payload.sub))
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        tenantId: users.tenantId,
        avatarMime: users.avatarMime,
        updatedAt: users.updatedAt,
        systemModuleRoles: users.systemModuleRoles,
      });
    if (!updated) return reply.code(404).send({ error: "Not found" });

    await writeAudit(app, {
      actor: payload,
      action: "user.avatar.delete",
      tenantId: payload.tenantId,
      resourceType: "user",
      resourceId: updated.id,
      request,
    });

    return { user: toAuthUser(updated, payload.employeeId ?? null) };
  });
};
