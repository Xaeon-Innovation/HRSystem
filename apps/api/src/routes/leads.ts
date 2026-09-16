import type { FastifyPluginAsync } from "fastify";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { leads, tenants } from "@hr/db";
import {
  leadQuerySchema,
  updateLeadSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { requireRoles } from "../types.js";

export const leadRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireRoles("super_admin"));

  app.get("/", async (request, reply) => {
    const parsed = leadQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { status, source, q, tenantId, limit, offset } = parsed.data;
    const conditions = [];
    if (status) conditions.push(eq(leads.status, status));
    if (source) conditions.push(eq(leads.source, source));
    if (tenantId) conditions.push(eq(leads.tenantId, tenantId));
    if (q?.trim()) {
      const pattern = `%${q.trim()}%`;
      conditions.push(
        or(
          ilike(leads.name, pattern),
          ilike(leads.company, pattern),
          ilike(leads.email, pattern),
        )!,
      );
    }
    const where = conditions.length ? and(...conditions) : undefined;

    const [totalRow] = await app.db
      .select({ n: count() })
      .from(leads)
      .where(where);

    const rows = await app.db
      .select({
        lead: leads,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(leads)
      .leftJoin(tenants, eq(leads.tenantId, tenants.id))
      .where(where)
      .orderBy(desc(leads.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      leads: rows.map((r) => ({
        ...r.lead,
        tenant: r.lead.tenantId
          ? {
              id: r.lead.tenantId,
              name: r.tenantName,
              slug: r.tenantSlug,
            }
          : null,
      })),
      total: Number(totalRow?.n ?? 0),
      limit,
      offset,
    };
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateLeadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const current = await app.db.query.leads.findFirst({
      where: eq(leads.id, id),
    });
    if (!current) return reply.code(404).send({ error: "Not found" });

    const [updated] = await app.db
      .update(leads)
      .set({
        status: parsed.data.status ?? current.status,
        notes:
          parsed.data.notes === undefined ? current.notes : parsed.data.notes,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, id))
      .returning();

    const actor = request.user as JwtPayload;
    if (parsed.data.status && parsed.data.status !== current.status) {
      await writeAudit(app, {
        actor,
        action: "lead.status_change",
        tenantId: updated.tenantId,
        resourceType: "lead",
        resourceId: updated.id,
        metadata: { before: current.status, after: updated.status },
        request,
      });
    }

    return { lead: updated };
  });
};
