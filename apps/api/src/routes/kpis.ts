import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, gte, inArray, isNull, lt } from "drizzle-orm";
import {
  attendanceRecords,
  canonicalJobEvents,
  integrationConnections,
  kpiAssignments,
  kpiDefinitions,
  kpiScores,
  tenants,
} from "@hr/db";
import {
  acknowledgeKpiScoresSchema,
  assignKpiSchema,
  createKpiSchema,
  recordKpiScoreSchema,
  updateKpiSchema,
} from "@hr/shared";
import type { JwtPayload } from "@hr/shared";
import { hasSystemModuleRole } from "@hr/shared";
import {
  requireModuleRole,
  requireTenantScope,
  tenantIdOf,
} from "../types.js";
import { todayInZone, zonedDayBounds } from "../lib/timezone.js";
import { requirePlanFeature } from "../lib/features.js";
import { CREATIVE_CMS_GOALS_PRESET } from "../integrations/presets/creative-cms-goals.js";

const ATTENDANCE_KPI_RE =
  /attendance|on[- ]?time|punctual|presenteeism/i;

function isAttendanceLikeKpi(name: string, description: string | null): boolean {
  if (ATTENDANCE_KPI_RE.test(name)) return true;
  if (description && ATTENDANCE_KPI_RE.test(description)) return true;
  return false;
}

export const kpiRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());
  app.addHook("preHandler", requirePlanFeature("peopleOps"));

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
    { preHandler: requireModuleRole("kpis") },
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
    { preHandler: requireModuleRole("kpis") },
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
    { preHandler: requireModuleRole("kpis") },
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
    { preHandler: requireModuleRole("kpis") },
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
    { preHandler: requireModuleRole("kpis") },
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
    { preHandler: requireModuleRole("kpis") },
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
    { preHandler: requireModuleRole("kpis") },
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

  /**
   * Light auto-actuals: for attendance-like KPI assignments, compute % of days
   * with a clock-in this calendar month and record a score if the period is empty.
   */
  app.post(
    "/auto-actuals",
    { preHandler: requireModuleRole("kpis") },
    async (request) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;

      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
      const tz = tenant?.settings.timezone ?? "UTC";
      const today = todayInZone(tz);
      const [year, month] = today.split("-").map(Number);
      const monthStartDay = `${year}-${String(month).padStart(2, "0")}-01`;
      const { start: monthStart } = zonedDayBounds(monthStartDay, tz);
      const { end: todayEnd } = zonedDayBounds(today, tz);
      const daysElapsed = Number(today.slice(8, 10));

      const assignments = await app.db.query.kpiAssignments.findMany({
        where: eq(kpiAssignments.tenantId, tenantId),
      });
      const employeeAssignments = assignments.filter(
        (a): a is typeof a & { employeeId: string } => Boolean(a.employeeId),
      );

      const kpiIds = [...new Set(employeeAssignments.map((a) => a.kpiId))];
      const kpis =
        kpiIds.length === 0
          ? []
          : await app.db.query.kpiDefinitions.findMany({
              where: and(
                eq(kpiDefinitions.tenantId, tenantId),
                inArray(kpiDefinitions.id, kpiIds),
              ),
            });
      const kpiById = new Map(kpis.map((k) => [k.id, k]));

      const created: { assignmentId: string; score: number }[] = [];
      const skipped: { assignmentId: string; reason: string }[] = [];

      for (const assignment of employeeAssignments) {
        const kpi = kpiById.get(assignment.kpiId);
        if (!kpi || !isAttendanceLikeKpi(kpi.name, kpi.description)) {
          skipped.push({
            assignmentId: assignment.id,
            reason: "not_attendance_like",
          });
          continue;
        }

        const existing = await app.db.query.kpiScores.findFirst({
          where: and(
            eq(kpiScores.tenantId, tenantId),
            eq(kpiScores.assignmentId, assignment.id),
            gte(kpiScores.reviewDate, monthStart),
            lt(kpiScores.reviewDate, todayEnd),
          ),
        });
        if (existing) {
          skipped.push({
            assignmentId: assignment.id,
            reason: "score_exists",
          });
          continue;
        }

        const records = await app.db.query.attendanceRecords.findMany({
          where: and(
            eq(attendanceRecords.tenantId, tenantId),
            eq(attendanceRecords.employeeId, assignment.employeeId),
            gte(attendanceRecords.clockInAt, monthStart),
            lt(attendanceRecords.clockInAt, todayEnd),
          ),
          columns: { clockInAt: true },
        });

        const daysWithClockIn = new Set<string>();
        for (const rec of records) {
          const day = new Intl.DateTimeFormat("en-CA", {
            timeZone: tz,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(rec.clockInAt);
          daysWithClockIn.add(day);
        }

        const denom = Math.max(1, daysElapsed);
        const pct = Math.round((daysWithClockIn.size / denom) * 1000) / 10;

        const [score] = await app.db
          .insert(kpiScores)
          .values({
            tenantId,
            assignmentId: assignment.id,
            score: pct,
            notes: `Auto-actual from attendance (${daysWithClockIn.size}/${denom} days with clock-in)`,
            reviewDate: new Date(),
            reviewerUserId: user.sub,
          })
          .returning();

        created.push({ assignmentId: assignment.id, score: score.score });
      }

      return {
        created: created.length,
        scores: created,
        skipped: skipped.length,
      };
    },
  );

  app.post("/scores/acknowledge", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const parsed = acknowledgeKpiScoresSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const rows = await app.db.query.kpiScores.findMany({
      where: and(
        eq(kpiScores.tenantId, tenantId),
        inArray(kpiScores.id, parsed.data.scoreIds),
      ),
    });
    if (rows.length === 0) {
      return reply.code(404).send({ error: "No scores found" });
    }

    const assignmentIds = [...new Set(rows.map((r) => r.assignmentId))];
    const assignments = await app.db.query.kpiAssignments.findMany({
      where: and(
        eq(kpiAssignments.tenantId, tenantId),
        inArray(kpiAssignments.id, assignmentIds),
      ),
    });
    const assignmentById = new Map(assignments.map((a) => [a.id, a]));

    const canAck = (assignmentId: string) => {
      if (hasSystemModuleRole(user, "kpis")) return true;
      const a = assignmentById.get(assignmentId);
      return Boolean(user.employeeId && a?.employeeId === user.employeeId);
    };

    const allowedIds = rows
      .filter((r) => canAck(r.assignmentId) && !r.acknowledgedAt)
      .map((r) => r.id);

    if (allowedIds.length === 0) {
      return { acknowledged: 0, scores: [] };
    }

    const now = new Date();
    const updated = await app.db
      .update(kpiScores)
      .set({
        acknowledgedAt: now,
        acknowledgedByUserId: user.sub,
      })
      .where(
        and(
          eq(kpiScores.tenantId, tenantId),
          inArray(kpiScores.id, allowedIds),
          isNull(kpiScores.acknowledgedAt),
        ),
      )
      .returning();

    return { acknowledged: updated.length, scores: updated };
  });

  app.get("/cms-goals", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const q = request.query as { employeeId?: string };

    let employeeId = q.employeeId;
    if (!hasSystemModuleRole(user, "kpis")) {
      employeeId = user.employeeId ?? undefined;
    }
    if (!employeeId) {
      return { linked: false, goals: [], total: null };
    }

    const connections = await app.db.query.integrationConnections.findMany({
      where: eq(integrationConnections.tenantId, tenantId),
    });
    const cms = connections.find(
      (c) =>
        (c.connectorConfig as { preset?: string } | null)?.preset ===
        CREATIVE_CMS_GOALS_PRESET,
    );
    if (!cms) {
      return { linked: false, goals: [], total: null };
    }

    const events = await app.db.query.canonicalJobEvents.findMany({
      where: and(
        eq(canonicalJobEvents.tenantId, tenantId),
        eq(canonicalJobEvents.sourceConnectionId, cms.id),
        eq(canonicalJobEvents.employeeId, employeeId),
      ),
      orderBy: [desc(canonicalJobEvents.occurredAt)],
      limit: 40,
    });

    const goals = events
      .filter((e) => e.eventType !== "goal_analysis" && e.title)
      .map((e) => ({
        id: e.id,
        title: e.title ?? "CMS Goal",
        category: e.category,
        status: e.status,
        valueAmount: e.valueAmount,
        occurredAt: e.occurredAt.toISOString(),
        completedAt: e.completedAt?.toISOString() ?? null,
      }));

    const analysis = events.find(
      (e) =>
        e.externalRecordId &&
        !e.title &&
        e.valueAmount != null,
    );
    const total =
      analysis?.valueAmount != null
        ? { completionRate: analysis.valueAmount, status: analysis.status }
        : goals.length > 0
          ? {
              completionRate:
                (goals.filter(
                  (g) =>
                    g.completedAt ||
                    String(g.status).toLowerCase() === "true" ||
                    String(g.status).toLowerCase() === "completed",
                ).length /
                  goals.length) *
                100,
              status: null as string | null,
            }
          : null;

    return { linked: true, goals, total };
  });

  app.get("/summary", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const q = request.query as { employeeId?: string };

    const assignments = await app.db.query.kpiAssignments.findMany({
      where: and(
        eq(kpiAssignments.tenantId, tenantId),
        !hasSystemModuleRole(user, "kpis") && user.employeeId
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
