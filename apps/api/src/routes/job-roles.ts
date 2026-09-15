import type { FastifyPluginAsync } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { employeeJobRoles, jobRoles } from "@hr/db";
import {
  createJobRoleSchema,
  updateJobRoleSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { requireRoles, tenantIdOf } from "../types.js";
import { requireActiveSubscription } from "../lib/features.js";

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

export const jobRoleRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireActiveSubscription());

  app.get("/", async (request) => {
    const tenantId = tenantIdOf(request);
    const rows = await app.db.query.jobRoles.findMany({
      where: eq(jobRoles.tenantId, tenantId),
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    const counts = await app.db
      .select({
        jobRoleId: employeeJobRoles.jobRoleId,
        count: sql<number>`count(*)::int`,
      })
      .from(employeeJobRoles)
      .where(eq(employeeJobRoles.tenantId, tenantId))
      .groupBy(employeeJobRoles.jobRoleId);
    const countById = new Map(counts.map((c) => [c.jobRoleId, c.count]));
    return {
      jobRoles: rows.map((row) => ({
        ...row,
        employeeCount: countById.get(row.id) ?? 0,
      })),
    };
  });

  app.post(
    "/",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createJobRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const name = normalizeName(parsed.data.name);
      const clash = await app.db
        .select({ id: jobRoles.id })
        .from(jobRoles)
        .where(
          and(
            eq(jobRoles.tenantId, tenantId),
            sql`lower(${jobRoles.name}) = ${name.toLowerCase()}`,
          ),
        )
        .limit(1);
      if (clash[0]) {
        return reply.code(409).send({ error: "A job role with that name already exists" });
      }
      try {
        const [row] = await app.db
          .insert(jobRoles)
          .values({ tenantId, name })
          .returning();
        const actor = request.user as JwtPayload;
        await writeAudit(app, {
          actor,
          action: "job_role.create",
          tenantId,
          resourceType: "job_role",
          resourceId: row.id,
          metadata: { name: row.name },
          request,
        });
        return reply.code(201).send({ jobRole: { ...row, employeeCount: 0 } });
      } catch {
        return reply.code(409).send({ error: "A job role with that name already exists" });
      }
    },
  );

  app.patch(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateJobRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.jobRoles.findFirst({
        where: and(eq(jobRoles.id, id), eq(jobRoles.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      const name = parsed.data.name
        ? normalizeName(parsed.data.name)
        : existing.name;
      if (name.toLowerCase() !== existing.name.toLowerCase()) {
        const clash = await app.db
          .select({ id: jobRoles.id })
          .from(jobRoles)
          .where(
            and(
              eq(jobRoles.tenantId, tenantId),
              sql`lower(${jobRoles.name}) = ${name.toLowerCase()}`,
            ),
          )
          .limit(1);
        if (clash[0] && clash[0].id !== id) {
          return reply
            .code(409)
            .send({ error: "A job role with that name already exists" });
        }
      }
      try {
        const [updated] = await app.db
          .update(jobRoles)
          .set({ name, updatedAt: new Date() })
          .where(and(eq(jobRoles.id, id), eq(jobRoles.tenantId, tenantId)))
          .returning();
        const actor = request.user as JwtPayload;
        await writeAudit(app, {
          actor,
          action: "job_role.update",
          tenantId,
          resourceType: "job_role",
          resourceId: id,
          metadata: { name },
          request,
        });
        return { jobRole: updated };
      } catch {
        return reply.code(409).send({ error: "A job role with that name already exists" });
      }
    },
  );

  app.delete(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const existing = await app.db.query.jobRoles.findFirst({
        where: and(eq(jobRoles.id, id), eq(jobRoles.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      await app.db
        .delete(jobRoles)
        .where(and(eq(jobRoles.id, id), eq(jobRoles.tenantId, tenantId)));
      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "job_role.delete",
        tenantId,
        resourceType: "job_role",
        resourceId: id,
        metadata: { name: existing.name },
        request,
      });
      return { ok: true };
    },
  );
};
