import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import {
  analyticsAlerts,
  analyticsMetricResults,
  attendanceRecords,
  branchDailyAnalytics,
  branches,
  canonicalJobEvents,
  canonicalSalesEvents,
  canonicalTaskEvents,
  canonicalVisitEvents,
  employeeDailyAnalytics,
  employees,
  locationPings,
  users,
} from "@hr/db";
import {
  analyticsCorrelationSchema,
  analyticsDrilldownSchema,
  analyticsQuerySchema,
  analyticsTimelineSchema,
  updateAlertSchema,
  type JwtPayload,
} from "@hr/shared";
import { requirePlanFeature } from "../lib/features.js";
import { addDays, todayInZone, zonedDayBounds } from "../lib/timezone.js";
import { requireRoles, tenantIdOf } from "../types.js";

function range(tenantTz: string, from?: string, to?: string) {
  const today = todayInZone(tenantTz);
  return {
    from: from ?? addDays(today, -13),
    to: to ?? today,
  };
}

export const analyticsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requirePlanFeature("analytics"));

  async function tenantTz(tenantId: string) {
    const tenant = await app.db.query.tenants.findFirst({
      where: (t, { eq: e }) => e(t.id, tenantId),
    });
    return tenant?.settings.timezone ?? "UTC";
  }

  app.get("/summary", async (request) => {
    const tenantId = tenantIdOf(request);
    const tz = await tenantTz(tenantId);
    const parsed = analyticsQuerySchema.safeParse(request.query);
    const { from, to } = range(tz, parsed.success ? parsed.data.from : undefined, parsed.success ? parsed.data.to : undefined);
    const branchId = parsed.success ? parsed.data.branchId : undefined;

    const rows = await app.db.query.employeeDailyAnalytics.findMany({
      where: and(
        eq(employeeDailyAnalytics.tenantId, tenantId),
        gte(employeeDailyAnalytics.day, from),
        lte(employeeDailyAnalytics.day, to),
        branchId ? eq(employeeDailyAnalytics.branchId, branchId) : undefined,
      ),
    });
    const byDay = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = byDay.get(row.day) ?? [];
      list.push(row);
      byDay.set(row.day, list);
    }
    const latest = rows.filter((r) => r.day === to);
    const active = new Set(latest.map((r) => r.employeeId)).size || new Set(rows.map((r) => r.employeeId)).size;
    const clocked = latest.filter((r) => r.wasClockedIn).length;
    const jobs = latest.reduce((s, r) => s + r.jobsCompletedCount, 0);
    const visits = latest.reduce((s, r) => s + r.visitsCompletedCount, 0);
    const revenue = latest.reduce((s, r) => s + r.revenueGenerated, 0);
    const labor = latest.reduce((s, r) => s + r.laborCostEstimate, 0);
    const productivity =
      latest.length === 0
        ? 0
        : latest.reduce((s, r) => s + r.productivityScore, 0) / latest.length;

    const metrics = await app.db.query.analyticsMetricResults.findMany({
      where: and(
        eq(analyticsMetricResults.tenantId, tenantId),
        eq(analyticsMetricResults.entityType, "tenant"),
        eq(analyticsMetricResults.dateBucket, to),
      ),
    });

    const trend = [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, list]) => ({
        day,
        attendanceRate: list.length
          ? list.filter((r) => r.wasClockedIn).length / list.length
          : 0,
        jobs: list.reduce((s, r) => s + r.jobsCompletedCount, 0),
        visits: list.reduce((s, r) => s + r.visitsCompletedCount, 0),
        revenue: list.reduce((s, r) => s + r.revenueGenerated, 0),
        productivity:
          list.length === 0
            ? 0
            : list.reduce((s, r) => s + r.productivityScore, 0) / list.length,
      }));

    return {
      from,
      to,
      kpis: {
        attendanceRate: active ? clocked / active : 0,
        activeEmployees: active,
        jobsCompleted: jobs,
        visitsCompleted: visits,
        productivityScore: productivity,
        laborCostVsOutput: jobs + visits ? labor / (jobs + visits) : 0,
        revenue,
      },
      trend,
      metrics: metrics.map((m) => ({
        metricDefinitionId: m.metricDefinitionId,
        value: m.valueNumeric,
        version: m.version,
      })),
    };
  });

  app.get("/attendance", async (request) => {
    const tenantId = tenantIdOf(request);
    const tz = await tenantTz(tenantId);
    const parsed = analyticsQuerySchema.safeParse(request.query);
    const { from, to } = range(tz, parsed.data?.from, parsed.data?.to);
    const rows = await app.db.query.employeeDailyAnalytics.findMany({
      where: and(
        eq(employeeDailyAnalytics.tenantId, tenantId),
        gte(employeeDailyAnalytics.day, from),
        lte(employeeDailyAnalytics.day, to),
      ),
    });
    return {
      from,
      to,
      attendanceRate: rows.length
        ? rows.filter((r) => r.wasClockedIn).length / rows.length
        : 0,
      latenessRate: rows.filter((r) => r.wasClockedIn).length
        ? rows.filter((r) => r.latenessMinutes > 0).length /
          rows.filter((r) => r.wasClockedIn).length
        : 0,
      missedClockOuts: rows.filter((r) => r.anomalyScore >= 0.4).length,
      totalWorkHours: rows.reduce((s, r) => s + r.totalWorkMinutes, 0) / 60,
      gpsCoverage: (() => {
        const exp = rows.reduce((s, r) => s + r.gpsExpectedCount, 0);
        return exp ? rows.reduce((s, r) => s + r.gpsUpdatesCount, 0) / exp : 0;
      })(),
    };
  });

  app.get("/productivity", async (request) => {
    const tenantId = tenantIdOf(request);
    const tz = await tenantTz(tenantId);
    const parsed = analyticsQuerySchema.safeParse(request.query);
    const { from, to } = range(tz, parsed.data?.from, parsed.data?.to);
    const rows = await app.db.query.employeeDailyAnalytics.findMany({
      where: and(
        eq(employeeDailyAnalytics.tenantId, tenantId),
        gte(employeeDailyAnalytics.day, from),
        lte(employeeDailyAnalytics.day, to),
      ),
    });
    return {
      from,
      to,
      productivityScore:
        rows.length === 0
          ? 0
          : rows.reduce((s, r) => s + r.productivityScore, 0) / rows.length,
      jobsCompleted: rows.reduce((s, r) => s + r.jobsCompletedCount, 0),
      visitsCompleted: rows.reduce((s, r) => s + r.visitsCompletedCount, 0),
      taskCompletionRate: (() => {
        const assigned = rows.reduce((s, r) => s + r.tasksAssignedCount, 0);
        return assigned
          ? rows.reduce((s, r) => s + r.tasksCompletedCount, 0) / assigned
          : 0;
      })(),
    };
  });

  app.get("/field-ops", async (request) => {
    const tenantId = tenantIdOf(request);
    const tz = await tenantTz(tenantId);
    const parsed = analyticsQuerySchema.safeParse(request.query);
    const { from, to } = range(tz, parsed.data?.from, parsed.data?.to);
    const rows = await app.db.query.employeeDailyAnalytics.findMany({
      where: and(
        eq(employeeDailyAnalytics.tenantId, tenantId),
        gte(employeeDailyAnalytics.day, from),
        lte(employeeDailyAnalytics.day, to),
      ),
    });
    return {
      from,
      to,
      gpsCoverage: (() => {
        const exp = rows.reduce((s, r) => s + r.gpsExpectedCount, 0);
        return exp ? rows.reduce((s, r) => s + r.gpsUpdatesCount, 0) / exp : 0;
      })(),
      visitsCompleted: rows.reduce((s, r) => s + r.visitsCompletedCount, 0),
      jobsCompleted: rows.reduce((s, r) => s + r.jobsCompletedCount, 0),
      offRouteFlags: rows.reduce((s, r) => s + r.offRouteFlags, 0),
    };
  });

  app.get("/business-output", async (request) => {
    const tenantId = tenantIdOf(request);
    const tz = await tenantTz(tenantId);
    const parsed = analyticsQuerySchema.safeParse(request.query);
    const { from, to } = range(tz, parsed.data?.from, parsed.data?.to);
    const rows = await app.db.query.employeeDailyAnalytics.findMany({
      where: and(
        eq(employeeDailyAnalytics.tenantId, tenantId),
        gte(employeeDailyAnalytics.day, from),
        lte(employeeDailyAnalytics.day, to),
      ),
    });
    const revenue = rows.reduce((s, r) => s + r.revenueGenerated, 0);
    const labor = rows.reduce((s, r) => s + r.laborCostEstimate, 0);
    const output =
      rows.reduce((s, r) => s + r.jobsCompletedCount + r.visitsCompletedCount, 0);
    const employeesCount = new Set(rows.map((r) => r.employeeId)).size;
    return {
      from,
      to,
      revenue,
      laborCost: labor,
      jobsCompleted: rows.reduce((s, r) => s + r.jobsCompletedCount, 0),
      visitsCompleted: rows.reduce((s, r) => s + r.visitsCompletedCount, 0),
      revenuePerEmployee: employeesCount ? revenue / employeesCount : 0,
      laborCostPerOutput: output ? labor / output : 0,
    };
  });

  app.get("/branches/:branchId", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const { branchId } = request.params as { branchId: string };
    const branch = await app.db.query.branches.findFirst({
      where: and(eq(branches.id, branchId), eq(branches.tenantId, tenantId)),
    });
    if (!branch) return reply.code(404).send({ error: "Not found" });
    const tz = await tenantTz(tenantId);
    const parsed = analyticsQuerySchema.safeParse(request.query);
    const { from, to } = range(tz, parsed.data?.from, parsed.data?.to);
    const rows = await app.db.query.branchDailyAnalytics.findMany({
      where: and(
        eq(branchDailyAnalytics.tenantId, tenantId),
        eq(branchDailyAnalytics.branchId, branchId),
        gte(branchDailyAnalytics.day, from),
        lte(branchDailyAnalytics.day, to),
      ),
      orderBy: [desc(branchDailyAnalytics.day)],
    });
    return { branch, from, to, days: rows };
  });

  app.get("/employees/:employeeId", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const { employeeId } = request.params as { employeeId: string };
    if (user.role === "employee" && user.employeeId !== employeeId) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const empRows = await app.db
      .select({
        id: employees.id,
        name: users.name,
        jobTitle: employees.jobTitle,
        branchId: employees.branchId,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)))
      .limit(1);
    if (!empRows[0]) return reply.code(404).send({ error: "Not found" });
    const tz = await tenantTz(tenantId);
    const parsed = analyticsQuerySchema.safeParse(request.query);
    const { from, to } = range(tz, parsed.data?.from, parsed.data?.to);
    const days = await app.db.query.employeeDailyAnalytics.findMany({
      where: and(
        eq(employeeDailyAnalytics.tenantId, tenantId),
        eq(employeeDailyAnalytics.employeeId, employeeId),
        gte(employeeDailyAnalytics.day, from),
        lte(employeeDailyAnalytics.day, to),
      ),
      orderBy: [desc(employeeDailyAnalytics.day)],
    });
    return { employee: empRows[0], from, to, days };
  });

  app.get("/alerts", async (request) => {
    const tenantId = tenantIdOf(request);
    const status = (request.query as { status?: string }).status;
    const rows = await app.db.query.analyticsAlerts.findMany({
      where: and(
        eq(analyticsAlerts.tenantId, tenantId),
        status
          ? eq(
              analyticsAlerts.status,
              status as typeof analyticsAlerts.$inferSelect.status,
            )
          : undefined,
      ),
      orderBy: [desc(analyticsAlerts.createdAt)],
      limit: 100,
    });
    return { alerts: rows };
  });

  app.patch(
    "/alerts/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateAlertSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const [updated] = await app.db
        .update(analyticsAlerts)
        .set({ status: parsed.data.status, updatedAt: new Date() })
        .where(
          and(eq(analyticsAlerts.id, id), eq(analyticsAlerts.tenantId, tenantId)),
        )
        .returning();
      if (!updated) return reply.code(404).send({ error: "Not found" });
      return { alert: updated };
    },
  );

  app.get("/drilldown", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const parsed = analyticsDrilldownSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const tz = await tenantTz(tenantId);
    const { from, to } = range(tz, parsed.data.from, parsed.data.to);
    const rows = await app.db.query.employeeDailyAnalytics.findMany({
      where: and(
        eq(employeeDailyAnalytics.tenantId, tenantId),
        gte(employeeDailyAnalytics.day, from),
        lte(employeeDailyAnalytics.day, to),
        parsed.data.branchId
          ? eq(employeeDailyAnalytics.branchId, parsed.data.branchId)
          : undefined,
      ),
    });
    const metric = parsed.data.metric;
    const pick = (r: (typeof rows)[number]) => {
      switch (metric) {
        case "visits_completed":
          return r.visitsCompletedCount;
        case "jobs_completed":
          return r.jobsCompletedCount;
        case "revenue":
          return r.revenueGenerated;
        case "work_minutes":
          return r.totalWorkMinutes;
        default:
          return r.productivityScore;
      }
    };
    const groups = new Map<string, number>();
    for (const row of rows) {
      const key =
        parsed.data.groupBy === "day"
          ? row.day
          : parsed.data.groupBy === "branch"
            ? row.branchId ?? "unassigned"
            : row.employeeId;
      groups.set(key, (groups.get(key) ?? 0) + pick(row));
    }
    return {
      metric,
      groupBy: parsed.data.groupBy,
      from,
      to,
      rows: [...groups.entries()].map(([key, value]) => ({ key, value })),
    };
  });

  app.get("/timeline", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const parsed = analyticsTimelineSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    if (user.role === "employee" && user.employeeId !== parsed.data.employeeId) {
      return reply.code(403).send({ error: "Forbidden" });
    }
    const tz = await tenantTz(tenantId);
    const { start, end } = zonedDayBounds(parsed.data.date, tz);
    const [attendance, pings, jobs, visits, tasks, sales] = await Promise.all([
      app.db.query.attendanceRecords.findMany({
        where: and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.employeeId, parsed.data.employeeId),
        ),
      }),
      app.db.query.locationPings.findMany({
        where: and(
          eq(locationPings.tenantId, tenantId),
          eq(locationPings.employeeId, parsed.data.employeeId),
          gte(locationPings.recordedAt, start),
          lte(locationPings.recordedAt, end),
        ),
        limit: 200,
      }),
      app.db.query.canonicalJobEvents.findMany({
        where: and(
          eq(canonicalJobEvents.tenantId, tenantId),
          eq(canonicalJobEvents.employeeId, parsed.data.employeeId),
          gte(canonicalJobEvents.occurredAt, start),
          lte(canonicalJobEvents.occurredAt, end),
        ),
      }),
      app.db.query.canonicalVisitEvents.findMany({
        where: and(
          eq(canonicalVisitEvents.tenantId, tenantId),
          eq(canonicalVisitEvents.employeeId, parsed.data.employeeId),
        ),
      }),
      app.db.query.canonicalTaskEvents.findMany({
        where: and(
          eq(canonicalTaskEvents.tenantId, tenantId),
          eq(canonicalTaskEvents.employeeId, parsed.data.employeeId),
        ),
      }),
      app.db.query.canonicalSalesEvents.findMany({
        where: and(
          eq(canonicalSalesEvents.tenantId, tenantId),
          eq(canonicalSalesEvents.employeeId, parsed.data.employeeId),
          gte(canonicalSalesEvents.eventDate, start),
          lte(canonicalSalesEvents.eventDate, end),
        ),
      }),
    ]);
    const events = [
      ...attendance
        .filter((a) => a.clockInAt >= start && a.clockInAt < end)
        .map((a) => ({
          at: a.clockInAt,
          type: "clock_in",
          title: "Clock in",
        })),
      ...jobs.map((j) => ({
        at: j.occurredAt,
        type: "job",
        title: j.title ?? j.eventType,
      })),
      ...visits
        .filter((v) => v.checkInAt && v.checkInAt >= start && v.checkInAt < end)
        .map((v) => ({
          at: v.checkInAt!,
          type: "visit",
          title: v.visitStatus ?? "Visit",
        })),
      ...tasks
        .filter((t) => t.completedAt && t.completedAt >= start && t.completedAt < end)
        .map((t) => ({
          at: t.completedAt!,
          type: "task",
          title: t.taskType ?? "Task",
        })),
      ...sales.map((s) => ({
        at: s.eventDate,
        type: "sale",
        title: `Sale ${s.amount}`,
      })),
    ].sort((a, b) => a.at.getTime() - b.at.getTime());
    return {
      date: parsed.data.date,
      gpsCount: pings.length,
      events,
    };
  });

  app.get("/correlation", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const parsed = analyticsCorrelationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const tz = await tenantTz(tenantId);
    const to = todayInZone(tz);
    const from = addDays(to, -(parsed.data.periodDays - 1));
    const rows = await app.db.query.employeeDailyAnalytics.findMany({
      where: and(
        eq(employeeDailyAnalytics.tenantId, tenantId),
        gte(employeeDailyAnalytics.day, from),
        lte(employeeDailyAnalytics.day, to),
        parsed.data.branchId
          ? eq(employeeDailyAnalytics.branchId, parsed.data.branchId)
          : undefined,
      ),
    });
    const axis = (row: (typeof rows)[number], key: string) => {
      if (key === "work_minutes") return row.totalWorkMinutes;
      if (key === "jobs_completed") return row.jobsCompletedCount;
      if (key === "visits_completed") return row.visitsCompletedCount;
      if (key === "revenue") return row.revenueGenerated;
      if (key === "productivity") return row.productivityScore;
      return 0;
    };
    return {
      from,
      to,
      x: parsed.data.x,
      y: parsed.data.y,
      points: rows.map((r) => ({
        employeeId: r.employeeId,
        day: r.day,
        x: axis(r, parsed.data.x),
        y: axis(r, parsed.data.y),
      })),
    };
  });
};
