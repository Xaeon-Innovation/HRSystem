import type { FastifyPluginAsync } from "fastify";
import { and, eq, gte, lte, desc, sql } from "drizzle-orm";
import { auditLogs } from "@hr/db";
import { auditQuerySchema } from "@hr/shared";
import { requireRoles } from "../types.js";

export const auditRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireRoles("super_admin"));

  app.get("/", async (request, reply) => {
    const parsed = auditQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { tenantId, actorUserId, action, from, to, limit, offset } =
      parsed.data;

    const conditions = [
      tenantId ? eq(auditLogs.tenantId, tenantId) : undefined,
      actorUserId ? eq(auditLogs.actorUserId, actorUserId) : undefined,
      action ? eq(auditLogs.action, action) : undefined,
      from ? gte(auditLogs.createdAt, new Date(from)) : undefined,
      to ? lte(auditLogs.createdAt, new Date(to)) : undefined,
    ].filter(Boolean);

    const where =
      conditions.length === 0
        ? undefined
        : conditions.length === 1
          ? conditions[0]
          : and(...conditions);

    const rows = await app.db.query.auditLogs.findMany({
      where,
      orderBy: [desc(auditLogs.createdAt)],
      limit,
      offset,
    });

    const [countRow] = await app.db
      .select({ value: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(where);

    return { audits: rows, total: countRow?.value ?? rows.length, limit, offset };
  });
};
