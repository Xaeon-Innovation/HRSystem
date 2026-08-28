import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import {
  kpiAssignments,
  kpiDefinitions,
  kpiScores,
} from "@hr/db";
import {
  assignKpiSchema,
  createKpiSchema,
  recordKpiScoreSchema,
  updateKpiSchema,
} from "@hr/shared";
import type { JwtPayload } from "@hr/shared";
import {
  requireRoles,
  requireTenantScope,
  tenantIdOf,
} from "../types.js";

export const kpiRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

  app.get("/", async (request) => {
    const tenantId = tenantIdOf(request);
    const kpis = await app.db.query.kpiDefinitions.findMany({
      where: eq(kpiDefinitions.tenantId, tenantId),
      orderBy: [desc(kpiDefinitions.createdAt)],
    });
    return { kpis };
  });

  app.post(
    "/",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createKpiSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const [kpi] = await app.db
        .insert(kpiDefinitions)
        .values({ tenantId, ...parsed.data })
        .returning();
      return reply.code(201).send({ kpi });
    },
  );

  app.post(
    "/:id/clone",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const source = await app.db.query.kpiDefinitions.findFirst({
        where: and(eq(kpiDefinitions.id, id), eq(kpiDefinitions.tenantId, tenantId)),
      });
      if (!source) return reply.code(404).send({ error: "Not found" });
      const [kpi] = await app.db
        .insert(kpiDefinitions)
        .values({
          tenantId,
          name: `${source.name} (copy)`,
          type: source.type,
          targetValue: source.targetValue,
          reviewPeriod: source.reviewPeriod,
          description: source.description,
        })
        .returning();
      return reply.code(201).send({ kpi });
    },
  );

  app.patch(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateKpiSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.kpiDefinitions.findFirst({
        where: and(eq(kpiDefinitions.id, id), eq(kpiDefinitions.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      const [kpi] = await app.db
        .update(kpiDefinitions)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(and(eq(kpiDefinitions.id, id), eq(kpiDefinitions.tenantId, tenantId)))
        .returning();
      return { kpi };
    },
  );

  app.delete(
    "/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const existing = await app.db.query.kpiDefinitions.findFirst({
        where: and(eq(kpiDefinitions.id, id), eq(kpiDefinitions.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      await app.db
        .delete(kpiDefinitions)
        .where(and(eq(kpiDefinitions.id, id), eq(kpiDefinitions.tenantId, tenantId)));
      return { ok: true };
    },
  );

  app.delete(
    "/assignments/:assignmentId",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { assignmentId } = request.params as { assignmentId: string };
      const existing = await app.db.query.kpiAssignments.findFirst({
        where: and(
          eq(kpiAssignments.id, assignmentId),
          eq(kpiAssignments.tenantId, tenantId),
        ),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      await app.db
        .delete(kpiAssignments)
        .where(
          and(
            eq(kpiAssignments.id, assignmentId),
            eq(kpiAssignments.tenantId, tenantId),
          ),
        );
      return { ok: true };
    },
  );

  app.post(
    "/assign",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = assignKpiSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const kpi = await app.db.query.kpiDefinitions.findFirst({
        where: and(
          eq(kpiDefinitions.id, parsed.data.kpiId),
          eq(kpiDefinitions.tenantId, tenantId),
        ),
      });
      if (!kpi) return reply.code(404).send({ error: "KPI not found" });

      const [assignment] = await app.db
        .insert(kpiAssignments)
        .values({
          tenantId,
          kpiId: parsed.data.kpiId,
          employeeId: parsed.data.employeeId ?? null,
          roleTarget: parsed.data.roleTarget ?? null,
          dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt) : null,
        })
        .returning();
      return reply.code(201).send({ assignment });
    },
  );

  app.post(
    "/scores",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const parsed = recordKpiScoreSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const assignment = await app.db.query.kpiAssignments.findFirst({
        where: and(
          eq(kpiAssignments.id, parsed.data.assignmentId),
          eq(kpiAssignments.tenantId, tenantId),
        ),
      });
      if (!assignment) {
        return reply.code(404).send({ error: "Assignment not found" });
      }
      const [score] = await app.db
        .insert(kpiScores)
        .values({
          tenantId,
          assignmentId: parsed.data.assignmentId,
          score: parsed.data.score,
          notes: parsed.data.notes ?? null,
          reviewDate: parsed.data.reviewDate
            ? new Date(parsed.data.reviewDate)
            : new Date(),
          reviewerUserId: user.sub,
        })
        .returning();
      return reply.code(201).send({ score });
    },
  );

  app.get("/summary", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const q = request.query as { employeeId?: string };

    const assignments = await app.db.query.kpiAssignments.findMany({
      where: and(
        eq(kpiAssignments.tenantId, tenantId),
        user.role === "employee" && user.employeeId
          ? eq(kpiAssignments.employeeId, user.employeeId)
          : q.employeeId
            ? eq(kpiAssignments.employeeId, q.employeeId)
            : undefined,
      ),
    });

    const summary = [];
    for (const a of assignments) {
      const kpi = await app.db.query.kpiDefinitions.findFirst({
        where: and(
          eq(kpiDefinitions.id, a.kpiId),
          eq(kpiDefinitions.tenantId, tenantId),
        ),
      });
      const scores = await app.db.query.kpiScores.findMany({
        where: and(
          eq(kpiScores.assignmentId, a.id),
          eq(kpiScores.tenantId, tenantId),
        ),
        orderBy: [desc(kpiScores.reviewDate)],
        limit: 12,
      });
      summary.push({ assignment: a, kpi, scores });
    }
    return { summary };
  });
};
