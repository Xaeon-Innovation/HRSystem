import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { employees, tenants, users } from "@hr/db";
import {
  loginSchema,
  refreshSchema,
  uploadAvatarSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { decodeBase64Image, detectImageMime } from "../lib/avatar.js";
import {
  signTokens,
  toAuthUser,
  toJwtPayload,
} from "../lib/auth-tokens.js";
import { authenticate } from "../types.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post("/login", async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password, tenantSlug } = parsed.data;

    let tenantId: string | null = null;
    if (tenantSlug) {
      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.slug, tenantSlug),
      });
      if (!tenant || tenant.status !== "active") {
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
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, resolved.passwordHash);
    if (!ok) return reply.code(401).send({ error: "Invalid credentials" });

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
      const payload = app.jwt.verify<JwtPayload & { typ?: string }>(
        parsed.data.refreshToken,
      );
      const user = await app.db.query.users.findFirst({
        where: eq(users.id, payload.sub),
      });
      if (!user) return reply.code(401).send({ error: "Invalid refresh token" });

      let employeeId: string | null = payload.employeeId ?? null;
      if (user.tenantId) {
        const emp = await app.db.query.employees.findFirst({
          where: and(
            eq(employees.userId, user.id),
            eq(employees.tenantId, user.tenantId),
          ),
        });
        employeeId = emp?.id ?? null;
      }

      return signTokens(app, toJwtPayload(user, employeeId));
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

    let employeeId: string | null = payload.employeeId ?? null;
    if (user.tenantId) {
      const emp = await app.db.query.employees.findFirst({
        where: and(
          eq(employees.userId, user.id),
          eq(employees.tenantId, user.tenantId),
        ),
      });
      employeeId = emp?.id ?? null;
    }

    return toAuthUser(user, employeeId);
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
