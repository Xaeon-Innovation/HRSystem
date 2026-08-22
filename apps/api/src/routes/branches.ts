import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import { branches, employees, sites } from "@hr/db";
import {
  createBranchSchema,
  createSiteSchema,
  updateBranchSchema,
  updateSiteSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { requireRoles, requireTenantScope, tenantIdOf } from "../types.js";

export const branchRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

  app.get("/", async (request) => {
    const tenantId = tenantIdOf(request);
    const rows = await app.db.query.branches.findMany({
      where: eq(branches.tenantId, tenantId),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    const siteRows = await app.db.query.sites.findMany({
      where: eq(sites.tenantId, tenantId),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    const byBranch = new Map<string, typeof siteRows>();
    for (const site of siteRows) {
      const list = byBranch.get(site.branchId) ?? [];
      list.push(site);
      byBranch.set(site.branchId, list);
    }
    return {
      branches: rows.map((b) => ({
        ...b,
        sites: byBranch.get(b.id) ?? [],
      })),
    };
  });

  app.post(
    "/",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createBranchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      try {
        const [row] = await app.db
          .insert(branches)
          .values({
            tenantId,
            name: parsed.data.name,
            code: parsed.data.code,
            status: parsed.data.status ?? "active",
          })
          .returning();
        const actor = request.user as JwtPayload;
        await writeAudit(app, {
          actor,
          action: "branch.create",
          tenantId,
          resourceType: "branch",
          resourceId: row.id,
          metadata: { name: row.name, code: row.code },
          request,
        });
        return reply.code(201).send({ branch: row });
      } catch {
        return reply.code(409).send({ error: "Branch code already exists" });
      }
    },
  );

  app.patch(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateBranchSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.branches.findFirst({
        where: and(eq(branches.id, id), eq(branches.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      const [updated] = await app.db
        .update(branches)
        .set({
          name: parsed.data.name ?? existing.name,
          code: parsed.data.code ?? existing.code,
          status: parsed.data.status ?? existing.status,
          updatedAt: new Date(),
        })
        .where(and(eq(branches.id, id), eq(branches.tenantId, tenantId)))
        .returning();
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "branch.update",
        tenantId,
        resourceType: "branch",
        resourceId: id,
        request,
      });
      return { branch: updated };
    },
  );

  app.delete(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const existing = await app.db.query.branches.findFirst({
        where: and(eq(branches.id, id), eq(branches.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      await app.db
        .update(employees)
        .set({ branchId: null, siteId: null, updatedAt: new Date() })
        .where(and(eq(employees.tenantId, tenantId), eq(employees.branchId, id)));
      await app.db
        .delete(branches)
        .where(and(eq(branches.id, id), eq(branches.tenantId, tenantId)));
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "branch.delete",
        tenantId,
        resourceType: "branch",
        resourceId: id,
        request,
      });
      return { ok: true };
    },
  );
};

export const siteRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

  app.get("/", async (request) => {
    const tenantId = tenantIdOf(request);
    const branchId = (request.query as { branchId?: string }).branchId;
    const rows = await app.db.query.sites.findMany({
      where: and(
        eq(sites.tenantId, tenantId),
        branchId ? eq(sites.branchId, branchId) : undefined,
      ),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    return { sites: rows };
  });

  app.post(
    "/",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createSiteSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const branch = await app.db.query.branches.findFirst({
        where: and(
          eq(branches.id, parsed.data.branchId),
          eq(branches.tenantId, tenantId),
        ),
      });
      if (!branch) return reply.code(400).send({ error: "Branch not found" });
      try {
        const [row] = await app.db
          .insert(sites)
          .values({
            tenantId,
            branchId: parsed.data.branchId,
            name: parsed.data.name,
            code: parsed.data.code,
            lat: parsed.data.lat ?? null,
            lng: parsed.data.lng ?? null,
          })
          .returning();
        const actor = request.user as JwtPayload;
        await writeAudit(app, {
          actor,
          action: "site.create",
          tenantId,
          resourceType: "site",
          resourceId: row.id,
          metadata: { name: row.name, branchId: row.branchId },
          request,
        });
        return reply.code(201).send({ site: row });
      } catch {
        return reply.code(409).send({ error: "Site code already exists" });
      }
    },
  );

  app.patch(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateSiteSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.sites.findFirst({
        where: and(eq(sites.id, id), eq(sites.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      if (parsed.data.branchId) {
        const branch = await app.db.query.branches.findFirst({
          where: and(
            eq(branches.id, parsed.data.branchId),
            eq(branches.tenantId, tenantId),
          ),
        });
        if (!branch) return reply.code(400).send({ error: "Branch not found" });
      }
      const [updated] = await app.db
        .update(sites)
        .set({
          branchId: parsed.data.branchId ?? existing.branchId,
          name: parsed.data.name ?? existing.name,
          code: parsed.data.code ?? existing.code,
          lat: parsed.data.lat === undefined ? existing.lat : parsed.data.lat,
          lng: parsed.data.lng === undefined ? existing.lng : parsed.data.lng,
          updatedAt: new Date(),
        })
        .where(and(eq(sites.id, id), eq(sites.tenantId, tenantId)))
        .returning();
      return { site: updated };
    },
  );

  app.delete(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const existing = await app.db.query.sites.findFirst({
        where: and(eq(sites.id, id), eq(sites.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      await app.db
        .update(employees)
        .set({ siteId: null, updatedAt: new Date() })
        .where(and(eq(employees.tenantId, tenantId), eq(employees.siteId, id)));
      await app.db
        .delete(sites)
        .where(and(eq(sites.id, id), eq(sites.tenantId, tenantId)));
      return { ok: true };
    },
  );
};
