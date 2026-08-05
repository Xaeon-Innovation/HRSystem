import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { employees, tenants, users } from "@hr/db";
import { loginSchema, refreshSchema, type JwtPayload } from "@hr/shared";
import { authenticate } from "../types.js";

function signTokens(app: Parameters<FastifyPluginAsync>[0], payload: JwtPayload) {
  const accessToken = app.jwt.sign(payload, { expiresIn: "15m" });
  const refreshToken = app.jwt.sign(payload, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

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

    const payload: JwtPayload = {
      sub: resolved.id,
      role: resolved.role,
      tenantId: resolved.tenantId,
      employeeId,
    };
    const tokens = signTokens(app, payload);
    return {
      ...tokens,
      user: {
        id: resolved.id,
        email: resolved.email,
        name: resolved.name,
        role: resolved.role,
        tenantId: resolved.tenantId,
        employeeId,
      },
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
      const next: JwtPayload = {
        sub: payload.sub,
        role: payload.role,
        tenantId: payload.tenantId,
        employeeId: payload.employeeId ?? null,
      };
      return signTokens(app, next);
    } catch {
      return reply.code(401).send({ error: "Invalid refresh token" });
    }
  });

  app.get("/me", { preHandler: authenticate }, async (request) => {
    const payload = request.user as JwtPayload;
    const user = await app.db.query.users.findFirst({
      where: eq(users.id, payload.sub),
    });
    if (!user) return { error: "Not found" };
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      employeeId: payload.employeeId ?? null,
    };
  });
};
