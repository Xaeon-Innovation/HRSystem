import type { FastifyPluginAsync } from "fastify";
import { and, count, desc, eq } from "drizzle-orm";
import { paymentEvents, tenants } from "@hr/db";
import { paymentEventQuerySchema } from "@hr/shared";
import { requireRoles } from "../types.js";

export const paymentEventRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireRoles("super_admin"));

  app.get("/", async (request, reply) => {
    const parsed = paymentEventQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { tenantId, provider, triggerType, limit, offset } = parsed.data;
    const conditions = [];
    if (tenantId) conditions.push(eq(paymentEvents.tenantId, tenantId));
    if (provider) conditions.push(eq(paymentEvents.provider, provider));
    if (triggerType) conditions.push(eq(paymentEvents.triggerType, triggerType));
    const where = conditions.length ? and(...conditions) : undefined;

    const [totalRow] = await app.db
      .select({ n: count() })
      .from(paymentEvents)
      .where(where);

    const rows = await app.db
      .select({
        event: paymentEvents,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(paymentEvents)
      .leftJoin(tenants, eq(paymentEvents.tenantId, tenants.id))
      .where(where)
      .orderBy(desc(paymentEvents.processedAt))
      .limit(limit)
      .offset(offset);

    return {
      events: rows.map((r) => ({
        ...r.event,
        tenant: r.event.tenantId
          ? {
              id: r.event.tenantId,
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
};
