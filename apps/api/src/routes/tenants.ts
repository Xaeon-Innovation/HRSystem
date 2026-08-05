import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { employees, tenants, users } from "@hr/db";
import { createTenantSchema, updateTenantSchema } from "@hr/shared";
import { requireRoles } from "../types.js";

export const tenantRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireRoles("super_admin"));

  app.get("/", async () => {
    const rows = await app.db.query.tenants.findMany({
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    return { tenants: rows };
  });

  app.post("/", async (request, reply) => {
    const parsed = createTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const existing = await app.db.query.tenants.findFirst({
      where: eq(tenants.slug, data.slug),
    });
    if (existing) {
      return reply.code(409).send({ error: "Slug already exists" });
    }

    const [tenant] = await app.db
      .insert(tenants)
      .values({
        name: data.name,
        slug: data.slug,
        settings: {
          brandingName: data.name,
          timezone: "Africa/Cairo",
          pingIntervalSec: 20,
          locationRetentionDays: 60,
          missedClockOutHours: 12,
        },
      })
      .returning();

    const [admin] = await app.db
      .insert(users)
      .values({
        tenantId: tenant.id,
        email: data.adminEmail,
        name: data.adminName,
        role: "tenant_admin",
        passwordHash: await bcrypt.hash(data.adminPassword, 10),
      })
      .returning();

    await app.db.insert(employees).values({
      tenantId: tenant.id,
      userId: admin.id,
      jobTitle: "Tenant Admin",
      status: "active",
    });

    return reply.code(201).send({ tenant, admin: { id: admin.id, email: admin.email } });
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const current = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });
    if (!current) return reply.code(404).send({ error: "Not found" });

    const [updated] = await app.db
      .update(tenants)
      .set({
        name: parsed.data.name ?? current.name,
        status: parsed.data.status ?? current.status,
        settings: { ...current.settings, ...(parsed.data.settings ?? {}) },
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    return { tenant: updated };
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [updated] = await app.db
      .update(tenants)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    if (!updated) return reply.code(404).send({ error: "Not found" });
    return { tenant: updated };
  });
};
