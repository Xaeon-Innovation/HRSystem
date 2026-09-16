import { and, eq, gte, inArray, isNull, lt, lte, or, sql } from "drizzle-orm";
import {
  attendanceRecords,
  branchDailyAnalytics,
  branches,
  canonicalJobEvents,
  canonicalSalesEvents,
  canonicalTaskEvents,
  canonicalVisitEvents,
  employeeDailyAnalytics,
  employees,
  kpiAssignments,
  kpiScores,
  locationPings,
  shiftInstances,
  tenants,
  type Db,
} from "@hr/db";
import {
  DEFAULT_HOURLY_COST,
  DEFAULT_LATENESS_GRACE_MINUTES,
  DEFAULT_SHIFT_START_HOUR,
} from "@hr/shared";
import {
  getTenantPlanFeatures,
  resolvePingIntervalSec,
} from "../lib/features.js";
import { addDays, todayInZone, zonedDayBounds } from "../lib/timezone.js";

function overlapMinutes(
  start: Date,
  end: Date,
  windowStart: Date,
  windowEnd: Date,
): number {
  const from = Math.max(start.getTime(), windowStart.getTime());
  const to = Math.min(end.getTime(), windowEnd.getTime());
  return Math.max(0, Math.round((to - from) / 60000));
}

export async function materializeTenantDays(
  db: Db,
  tenantId: string,
  fromDay: string,
  toDay: string,
) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });
  if (!tenant) return;
  const tz = tenant.settings.timezone ?? "UTC";
  const hourly = tenant.settings.defaultHourlyCost ?? DEFAULT_HOURLY_COST;
  const grace =
    tenant.settings.latenessGraceMinutes ?? DEFAULT_LATENESS_GRACE_MINUTES;
  const shiftStart = tenant.settings.shiftStartHour ?? DEFAULT_SHIFT_START_HOUR;
  const features = await getTenantPlanFeatures(db, tenantId);
  const pingSec = resolvePingIntervalSec(
    tenant.settings.pingIntervalSec,
    features,
  );

  const roster = await db.query.employees.findMany({
    where: and(eq(employees.tenantId, tenantId), eq(employees.status, "active")),
  });

  for (let day = fromDay; day <= toDay; day = addDays(day, 1)) {
    const { start, end } = zonedDayBounds(day, tz);
    const expectedStart = new Date(start.getTime() + (shiftStart * 60 + grace) * 60000);

    for (const emp of roster) {
      const rosterShift = await db.query.shiftInstances.findFirst({
        where: and(
          eq(shiftInstances.tenantId, tenantId),
          eq(shiftInstances.employeeId, emp.id),
          eq(shiftInstances.workDate, day),
          eq(shiftInstances.status, "scheduled"),
        ),
      });
      const empExpectedStart = rosterShift
        ? new Date(rosterShift.startAt.getTime() + grace * 60_000)
        : expectedStart;

      const shifts = await db.query.attendanceRecords.findMany({
        where: and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.employeeId, emp.id),
          lt(attendanceRecords.clockInAt, end),
          or(
            isNull(attendanceRecords.clockOutAt),
            gte(attendanceRecords.clockOutAt, start),
          ),
        ),
      });
      let workMinutes = 0;
      let lateness = 0;
      let missed = 0;
      for (const shift of shifts) {
        const out = shift.clockOutAt ?? (new Date() < end ? new Date() : end);
        workMinutes += overlapMinutes(shift.clockInAt, out, start, end);
        if (shift.clockInAt >= start && shift.clockInAt <= end) {
          if (rosterShift?.lateClockIn) {
            lateness += Math.max(
              0,
              Math.round(
                (shift.clockInAt.getTime() - empExpectedStart.getTime()) /
                  60000,
              ),
            );
          } else if (shift.clockInAt > empExpectedStart) {
            lateness += Math.round(
              (shift.clockInAt.getTime() - empExpectedStart.getTime()) / 60000,
            );
          }
        }
        if (shift.anomalyFlags.includes("missed_clock_out")) missed += 1;
      }
      const overtime = Math.max(0, workMinutes - 8 * 60);
      const wasClockedIn = shifts.length > 0;

      const pingRows = await db
        .select({ n: sql<number>`count(*)` })
        .from(locationPings)
        .where(
          and(
            eq(locationPings.tenantId, tenantId),
            eq(locationPings.employeeId, emp.id),
            gte(locationPings.recordedAt, start),
            lt(locationPings.recordedAt, end),
          ),
        );
      const gpsCount = Number(pingRows[0]?.n ?? 0);
      const gpsExpected =
        workMinutes > 0 ? Math.max(1, Math.round((workMinutes * 60) / pingSec)) : 0;

      const jobs = await db.query.canonicalJobEvents.findMany({
        where: and(
          eq(canonicalJobEvents.tenantId, tenantId),
          eq(canonicalJobEvents.employeeId, emp.id),
          gte(canonicalJobEvents.occurredAt, start),
          lt(canonicalJobEvents.occurredAt, end),
        ),
      });
      const jobsCompleted = jobs.filter((j) =>
        ["completed", "done", "closed"].includes(
          (j.eventType || j.status || "").toLowerCase(),
        ),
      ).length;

      const visits = await db.query.canonicalVisitEvents.findMany({
        where: and(
          eq(canonicalVisitEvents.tenantId, tenantId),
          eq(canonicalVisitEvents.employeeId, emp.id),
          or(
            and(
              gte(canonicalVisitEvents.checkInAt, start),
              lt(canonicalVisitEvents.checkInAt, end),
            ),
            and(
              gte(canonicalVisitEvents.checkOutAt, start),
              lt(canonicalVisitEvents.checkOutAt, end),
            ),
          ),
        ),
      });
      const visitsCompleted = visits.filter((v) =>
        ["completed", "done", "closed"].includes((v.visitStatus ?? "").toLowerCase()) ||
        Boolean(v.checkOutAt),
      ).length;

      const tasks = await db.query.canonicalTaskEvents.findMany({
        where: and(
          eq(canonicalTaskEvents.tenantId, tenantId),
          eq(canonicalTaskEvents.employeeId, emp.id),
        ),
      });
      const tasksAssigned = tasks.filter((t) => {
        const at = t.assignedAt ?? t.dueAt;
        return at && at >= start && at < end;
      }).length;
      const tasksCompleted = tasks.filter((t) => {
        const done = t.completedAt;
        return (
          done &&
          done >= start &&
          done < end &&
          ["completed", "done", "closed"].includes((t.status ?? "completed").toLowerCase())
        );
      }).length;

      const sales = await db.query.canonicalSalesEvents.findMany({
        where: and(
          eq(canonicalSalesEvents.tenantId, tenantId),
          eq(canonicalSalesEvents.employeeId, emp.id),
          gte(canonicalSalesEvents.eventDate, start),
          lt(canonicalSalesEvents.eventDate, end),
        ),
      });
      const jobRevenue = jobs.reduce((s, j) => s + (j.valueAmount ?? 0), 0);
      const visitRevenue = visits.reduce((s, v) => s + (v.revenueAmount ?? 0), 0);
      const salesRevenue = sales.reduce((s, r) => s + (r.amount ?? 0), 0);
      const revenue = jobRevenue + visitRevenue + salesRevenue;
      const labor = (workMinutes / 60) * hourly;

      const assignment = await db.query.kpiAssignments.findFirst({
        where: and(
          eq(kpiAssignments.tenantId, tenantId),
          eq(kpiAssignments.employeeId, emp.id),
        ),
      });
      let kpiScore: number | null = null;
      if (assignment) {
        const score = await db.query.kpiScores.findFirst({
          where: and(
            eq(kpiScores.tenantId, tenantId),
            eq(kpiScores.assignmentId, assignment.id),
            lte(kpiScores.reviewDate, end),
          ),
          orderBy: (t, { desc }) => [desc(t.reviewDate)],
        });
        kpiScore = score?.score ?? null;
      }

      const attendanceQuality = wasClockedIn ? 1 : 0;
      const punctuality = lateness === 0 && wasClockedIn ? 1 : wasClockedIn ? 0.5 : 0;
      const taskRate = tasksAssigned > 0 ? tasksCompleted / tasksAssigned : 0;
      const productivity =
        attendanceQuality * 25 +
        punctuality * 15 +
        Math.min(jobsCompleted, 10) * 2 +
        Math.min(visitsCompleted, 10) * 2 +
        taskRate * 10 +
        Math.min(kpiScore ?? 0, 100) * 0.1;
      const anomaly =
        (missed > 0 ? 0.4 : 0) +
        (lateness > 30 ? 0.3 : 0) +
        (wasClockedIn && jobsCompleted + visitsCompleted === 0 ? 0.3 : 0);

      await db
        .insert(employeeDailyAnalytics)
        .values({
          tenantId,
          employeeId: emp.id,
          day,
          branchId: emp.branchId,
          wasClockedIn,
          totalWorkMinutes: workMinutes,
          overtimeMinutes: overtime,
          latenessMinutes: lateness,
          gpsUpdatesCount: gpsCount,
          gpsExpectedCount: gpsExpected,
          offRouteFlags: 0,
          jobsCompletedCount: jobsCompleted,
          visitsCompletedCount: visitsCompleted,
          tasksCompletedCount: tasksCompleted,
          tasksAssignedCount: tasksAssigned,
          revenueGenerated: revenue,
          laborCostEstimate: labor,
          kpiScore,
          productivityScore: productivity,
          anomalyScore: anomaly,
          generatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            employeeDailyAnalytics.tenantId,
            employeeDailyAnalytics.employeeId,
            employeeDailyAnalytics.day,
          ],
          set: {
            branchId: emp.branchId,
            wasClockedIn,
            totalWorkMinutes: workMinutes,
            overtimeMinutes: overtime,
            latenessMinutes: lateness,
            gpsUpdatesCount: gpsCount,
            gpsExpectedCount: gpsExpected,
            jobsCompletedCount: jobsCompleted,
            visitsCompletedCount: visitsCompleted,
            tasksCompletedCount: tasksCompleted,
            tasksAssignedCount: tasksAssigned,
            revenueGenerated: revenue,
            laborCostEstimate: labor,
            kpiScore,
            productivityScore: productivity,
            anomalyScore: anomaly,
            generatedAt: new Date(),
          },
        });
    }

    const tenantBranches = await db.query.branches.findMany({
      where: eq(branches.tenantId, tenantId),
    });
    const unassignedId = null;
    const groups = new Map<string | null, typeof roster>();
    for (const emp of roster) {
      const key = emp.branchId;
      const list = groups.get(key) ?? [];
      list.push(emp);
      groups.set(key, list);
    }
    void unassignedId;

    for (const branch of tenantBranches) {
      const empIds = (groups.get(branch.id) ?? []).map((e) => e.id);
      const rows =
        empIds.length === 0
          ? []
          : await db.query.employeeDailyAnalytics.findMany({
              where: and(
                eq(employeeDailyAnalytics.tenantId, tenantId),
                eq(employeeDailyAnalytics.day, day),
                inArray(employeeDailyAnalytics.employeeId, empIds),
              ),
            });
      const active = empIds.length;
      const clocked = rows.filter((r) => r.wasClockedIn).length;
      const late = rows.filter((r) => r.latenessMinutes > 0).length;
      const missedClock = rows.reduce(
        (s, r) => s + (r.anomalyScore >= 0.4 ? 1 : 0),
        0,
      );
      const jobs = rows.reduce((s, r) => s + r.jobsCompletedCount, 0);
      const visits = rows.reduce((s, r) => s + r.visitsCompletedCount, 0);
      const revenue = rows.reduce((s, r) => s + r.revenueGenerated, 0);
      const labor = rows.reduce((s, r) => s + r.laborCostEstimate, 0);
      const productivity =
        rows.length === 0
          ? 0
          : rows.reduce((s, r) => s + r.productivityScore, 0) / rows.length;

      await db
        .insert(branchDailyAnalytics)
        .values({
          tenantId,
          branchId: branch.id,
          day,
          activeEmployees: active,
          clockedInEmployees: clocked,
          attendanceRate: active ? clocked / active : 0,
          latenessRate: clocked ? late / clocked : 0,
          missedClockOuts: missedClock,
          jobsCompletedCount: jobs,
          visitsCompletedCount: visits,
          revenueGenerated: revenue,
          laborCostEstimate: labor,
          productivityIndex: productivity,
          generatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [
            branchDailyAnalytics.tenantId,
            branchDailyAnalytics.branchId,
            branchDailyAnalytics.day,
          ],
          set: {
            activeEmployees: active,
            clockedInEmployees: clocked,
            attendanceRate: active ? clocked / active : 0,
            latenessRate: clocked ? late / clocked : 0,
            missedClockOuts: missedClock,
            jobsCompletedCount: jobs,
            visitsCompletedCount: visits,
            revenueGenerated: revenue,
            laborCostEstimate: labor,
            productivityIndex: productivity,
            generatedAt: new Date(),
          },
        });
    }
  }
}

export async function materializeOperational(db: Db) {
  const all = await db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
  });
  for (const tenant of all) {
    const tz = tenant.settings.timezone ?? "UTC";
    const today = todayInZone(tz);
    await materializeTenantDays(db, tenant.id, addDays(today, -1), today);
  }
}

export async function materializeStrategic(db: Db) {
  const all = await db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
  });
  for (const tenant of all) {
    const tz = tenant.settings.timezone ?? "UTC";
    const today = todayInZone(tz);
    await materializeTenantDays(db, tenant.id, addDays(today, -30), today);
  }
}
