import type { FastifyInstance } from "fastify";
import { and, avg, eq, gte, inArray, lt, lte } from "drizzle-orm";
import {
  attendanceRecords,
  employeeDailyAnalytics,
  employees,
  kpiAssignments,
  kpiScores,
  performanceReports,
  roleAssessments,
  shiftInstances,
  tenants,
  users,
  type PerformanceReportSnapshot,
} from "@hr/db";
import type { PerformanceReportCadence } from "@hr/shared";
import { computeShiftAndOvertimeMinutes } from "../lib/hours-report.js";
import {
  addDays,
  formatDayInZone,
  zonedDayBounds,
  zonedStartOfDay,
} from "../lib/timezone.js";
import { createNotification } from "./notifications.js";

function zonedWeekday(day: string, timeZone: string): number {
  const start = zonedStartOfDay(day, timeZone);
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(start);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[label] ?? 0;
}

function isLastDayOfMonth(day: string): boolean {
  const next = addDays(day, 1);
  return next.slice(5, 7) !== day.slice(5, 7);
}

function monthStart(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Monday of the week containing `day` (Mon–Sun weeks). */
function weekMonday(day: string, timeZone: string): string {
  const wd = zonedWeekday(day, timeZone);
  const offset = wd === 0 ? -6 : 1 - wd;
  return addDays(day, offset);
}

async function buildSnapshot(
  app: FastifyInstance,
  tenantId: string,
  employeeId: string,
  periodStart: string,
  periodEnd: string,
  timeZone: string,
): Promise<PerformanceReportSnapshot> {
  const analytics = await app.db.query.employeeDailyAnalytics.findMany({
    where: and(
      eq(employeeDailyAnalytics.tenantId, tenantId),
      eq(employeeDailyAnalytics.employeeId, employeeId),
      gte(employeeDailyAnalytics.day, periodStart),
      lte(employeeDailyAnalytics.day, periodEnd),
    ),
    columns: {
      day: true,
      wasClockedIn: true,
      totalWorkMinutes: true,
      latenessMinutes: true,
    },
  });

  let totalWorkMinutes = 0;
  let latenessMinutes = 0;
  let daysWorked = 0;
  for (const row of analytics) {
    totalWorkMinutes += row.totalWorkMinutes;
    latenessMinutes += row.latenessMinutes;
    if (row.wasClockedIn || row.totalWorkMinutes > 0) daysWorked += 1;
  }

  const { start: rangeStart } = zonedDayBounds(periodStart, timeZone);
  const { end: rangeEnd } = zonedDayBounds(periodEnd, timeZone);

  const sessions = await app.db.query.attendanceRecords.findMany({
    where: and(
      eq(attendanceRecords.tenantId, tenantId),
      eq(attendanceRecords.employeeId, employeeId),
      gte(attendanceRecords.clockInAt, rangeStart),
      lt(attendanceRecords.clockInAt, rangeEnd),
    ),
    columns: { clockInAt: true, clockOutAt: true },
  });
  const shifts = await app.db.query.shiftInstances.findMany({
    where: and(
      eq(shiftInstances.tenantId, tenantId),
      eq(shiftInstances.employeeId, employeeId),
      gte(shiftInstances.workDate, periodStart),
      lte(shiftInstances.workDate, periodEnd),
      eq(shiftInstances.status, "scheduled"),
    ),
    columns: { startAt: true, endAt: true },
  });

  const closed = sessions
    .filter((s): s is typeof s & { clockOutAt: Date } => s.clockOutAt != null)
    .map((s) => ({
      clockInAt:
        s.clockInAt instanceof Date ? s.clockInAt : new Date(s.clockInAt),
      clockOutAt:
        s.clockOutAt instanceof Date ? s.clockOutAt : new Date(s.clockOutAt),
    }));
  const shiftWindows = shifts.map((s) => ({
    startAt: s.startAt instanceof Date ? s.startAt : new Date(s.startAt),
    endAt: s.endAt instanceof Date ? s.endAt : new Date(s.endAt),
  }));
  const hours = computeShiftAndOvertimeMinutes(closed, shiftWindows);

  const assignments = await app.db.query.kpiAssignments.findMany({
    where: and(
      eq(kpiAssignments.tenantId, tenantId),
      eq(kpiAssignments.employeeId, employeeId),
    ),
    columns: { id: true },
  });
  let overallScore: number | null = null;
  if (assignments.length > 0) {
    const assignmentIds = assignments.map((a) => a.id);
    const [agg] = await app.db
      .select({ avg: avg(kpiScores.score) })
      .from(kpiScores)
      .where(
        and(
          eq(kpiScores.tenantId, tenantId),
          inArray(kpiScores.assignmentId, assignmentIds),
          gte(kpiScores.reviewDate, rangeStart),
          lte(kpiScores.reviewDate, rangeEnd),
        ),
      );
    if (agg?.avg != null) {
      overallScore = Number(agg.avg);
    }
  }

  const assessment = await app.db.query.roleAssessments.findFirst({
    where: and(
      eq(roleAssessments.tenantId, tenantId),
      eq(roleAssessments.employeeId, employeeId),
      lte(roleAssessments.periodStart, periodEnd),
      gte(roleAssessments.periodEnd, periodStart),
    ),
    orderBy: (t, { desc }) => [desc(t.periodEnd), desc(t.createdAt)],
  });

  return {
    attendance: {
      daysWorked,
      totalWorkMinutes,
      latenessMinutes,
    },
    hours: {
      shiftMinutes: hours.shiftMinutes,
      overtimeMinutes: hours.overtimeMinutes,
    },
    kpi: { overallScore },
    roleAssessment: assessment
      ? {
          assessmentId: assessment.id,
          overallComment: assessment.overallComment,
          scores: assessment.scores,
        }
      : { assessmentId: null, overallComment: null, scores: [] },
  };
}

async function upsertReport(
  app: FastifyInstance,
  input: {
    tenantId: string;
    employeeId: string;
    cadence: PerformanceReportCadence;
    periodStart: string;
    periodEnd: string;
    snapshot: PerformanceReportSnapshot;
  },
) {
  const now = new Date();
  await app.db
    .insert(performanceReports)
    .values({
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      cadence: input.cadence,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      snapshot: input.snapshot,
      generatedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        performanceReports.tenantId,
        performanceReports.employeeId,
        performanceReports.cadence,
        performanceReports.periodStart,
        performanceReports.periodEnd,
      ],
      set: {
        snapshot: input.snapshot,
        generatedAt: now,
        updatedAt: now,
        // feedback + feedbackAuthorUserId intentionally omitted so they are kept
      },
    });
}

async function notifyAdminsOnce(
  app: FastifyInstance,
  tenantId: string,
  cadence: PerformanceReportCadence,
  count: number,
) {
  if (count <= 0) return;
  const title =
    cadence === "daily"
      ? "Daily performance report ready"
      : cadence === "weekly"
        ? "Weekly performance report ready"
        : "Monthly performance report ready";
  const body = `${count} employee ${cadence} performance report${count === 1 ? "" : "s"} generated.`;
  const admins = await app.db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, "tenant_admin")),
    columns: { id: true },
  });
  for (const admin of admins) {
    await createNotification(app, {
      tenantId,
      userId: admin.id,
      type: "alert",
      title,
      body,
      metadata: { cadence, count },
    });
  }
}

export async function buildAndUpsertReportsForTenant(
  app: FastifyInstance,
  tenantId: string,
  asOfDate?: Date,
): Promise<{
  daily: number;
  weekly: number;
  monthly: number;
}> {
  const tenant = await app.db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { settings: true },
  });
  const tz = tenant?.settings.timezone ?? "UTC";
  const asOf = asOfDate ?? new Date();
  const today = formatDayInZone(asOf, tz);
  const yesterday = addDays(today, -1);

  const active = await app.db.query.employees.findMany({
    where: and(eq(employees.tenantId, tenantId), eq(employees.status, "active")),
    columns: { id: true },
  });

  let daily = 0;
  let weekly = 0;
  let monthly = 0;

  for (const emp of active) {
    const dailySnap = await buildSnapshot(
      app,
      tenantId,
      emp.id,
      yesterday,
      yesterday,
      tz,
    );
    await upsertReport(app, {
      tenantId,
      employeeId: emp.id,
      cadence: "daily",
      periodStart: yesterday,
      periodEnd: yesterday,
      snapshot: dailySnap,
    });
    daily += 1;
  }

  // Week ended yesterday (Sunday) → generate Mon–Sun weekly report.
  if (zonedWeekday(yesterday, tz) === 0) {
    const periodStart = weekMonday(yesterday, tz);
    const periodEnd = yesterday;
    for (const emp of active) {
      const snap = await buildSnapshot(
        app,
        tenantId,
        emp.id,
        periodStart,
        periodEnd,
        tz,
      );
      await upsertReport(app, {
        tenantId,
        employeeId: emp.id,
        cadence: "weekly",
        periodStart,
        periodEnd,
        snapshot: snap,
      });
      weekly += 1;
    }
  }

  // Previous month ended yesterday → generate that month's monthly report.
  if (isLastDayOfMonth(yesterday)) {
    const periodStart = monthStart(yesterday);
    const periodEnd = yesterday;
    for (const emp of active) {
      const snap = await buildSnapshot(
        app,
        tenantId,
        emp.id,
        periodStart,
        periodEnd,
        tz,
      );
      await upsertReport(app, {
        tenantId,
        employeeId: emp.id,
        cadence: "monthly",
        periodStart,
        periodEnd,
        snapshot: snap,
      });
      monthly += 1;
    }
  }

  await notifyAdminsOnce(app, tenantId, "daily", daily);
  await notifyAdminsOnce(app, tenantId, "weekly", weekly);
  await notifyAdminsOnce(app, tenantId, "monthly", monthly);

  return { daily, weekly, monthly };
}

export async function buildAndUpsertReportsForAllTenants(
  app: FastifyInstance,
  asOfDate?: Date,
) {
  const allTenants = await app.db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
    columns: { id: true },
  });
  let totals = { daily: 0, weekly: 0, monthly: 0 };
  for (const tenant of allTenants) {
    try {
      const counts = await buildAndUpsertReportsForTenant(
        app,
        tenant.id,
        asOfDate,
      );
      totals = {
        daily: totals.daily + counts.daily,
        weekly: totals.weekly + counts.weekly,
        monthly: totals.monthly + counts.monthly,
      };
    } catch (err) {
      app.log.error(
        { err, tenantId: tenant.id },
        "performance report generation failed",
      );
    }
  }
  return totals;
}
