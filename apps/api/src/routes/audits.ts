import type { FastifyPluginAsync } from "fastify";
import { and, eq, gte, lte, desc, sql, inArray } from "drizzle-orm";
import { auditLogs, users } from "@hr/db";
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

    const userIds = new Set<string>();
    for (const row of rows) {
      if (row.actorUserId) userIds.add(row.actorUserId);
      if (row.resourceType === "user" && row.resourceId) {
        userIds.add(row.resourceId);
      }
    }

    const userRows =
      userIds.size > 0
        ? await app.db.query.users.findMany({
            where: inArray(users.id, [...userIds]),
            columns: { id: true, name: true, email: true },
          })
        : [];
    const userById = new Map(userRows.map((u) => [u.id, u]));

    const audits = rows.map((row) => {
      const actor = row.actorUserId
        ? userById.get(row.actorUserId)
        : undefined;
      const resourceUser =
        row.resourceType === "user" && row.resourceId
          ? userById.get(row.resourceId)
          : undefined;
      const metaEmail =
        typeof row.metadata?.email === "string" ? row.metadata.email : null;

      return {
        ...row,
        actorName: actor?.name ?? null,
        resourceName:
          row.resourceType === "user"
            ? (resourceUser?.name ?? metaEmail)
            : null,
      };
    });

    const [countRow] = await app.db
      .select({ value: sql<number>`count(*)::int` })
      .from(auditLogs)
      .where(where);

    return {
      audits,
      total: countRow?.value ?? audits.length,
      limit,
      offset,
    };
  });
};
