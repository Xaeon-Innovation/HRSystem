import { and, eq, isNull, or } from "drizzle-orm";
import {
  analyticsMetricDefinitions,
  analyticsMetricResults,
  employeeDailyAnalytics,
  tenants,
  type Db,
} from "@hr/db";
import { addDays, todayInZone } from "../lib/timezone.js";

function safeDiv(n: number, d: number): number {
  if (!d) return 0;
  return n / d;
}

export async function refreshMetricResults(db: Db, tenantId: string, day: string) {
  const defs = await db.query.analyticsMetricDefinitions.findMany({
    where: and(
      eq(analyticsMetricDefinitions.isActive, true),
      or(
        isNull(analyticsMetricDefinitions.tenantId),
        eq(analyticsMetricDefinitions.tenantId, tenantId),
      ),
    ),
  });

  const empRows = await db.query.employeeDailyAnalytics.findMany({
    where: and(
      eq(employeeDailyAnalytics.tenantId, tenantId),
      eq(employeeDailyAnalytics.day, day),
    ),
  });

  const active = empRows.length;
  const clocked = empRows.filter((r) => r.wasClockedIn).length;
  const late = empRows.filter((r) => r.latenessMinutes > 0).length;
  const missed = empRows.filter((r) => r.anomalyScore >= 0.4).length;
  const workMinutes = empRows.reduce((s, r) => s + r.totalWorkMinutes, 0);
  const gps = empRows.reduce((s, r) => s + r.gpsUpdatesCount, 0);
  const gpsExpected = empRows.reduce((s, r) => s + r.gpsExpectedCount, 0);
  const jobs = empRows.reduce((s, r) => s + r.jobsCompletedCount, 0);
  const visits = empRows.reduce((s, r) => s + r.visitsCompletedCount, 0);
  const tasksDone = empRows.reduce((s, r) => s + r.tasksCompletedCount, 0);
  const tasksAssigned = empRows.reduce((s, r) => s + r.tasksAssignedCount, 0);
  const revenue = empRows.reduce((s, r) => s + r.revenueGenerated, 0);
  const labor = empRows.reduce((s, r) => s + r.laborCostEstimate, 0);
  const productivity =
    empRows.length === 0
      ? 0
      : empRows.reduce((s, r) => s + r.productivityScore, 0) / empRows.length;

  const values: Record<string, number> = {
    attendance_rate: safeDiv(clocked, active),
    lateness_rate: safeDiv(late, clocked),
    missed_clock_out_rate: safeDiv(missed, clocked),
    total_work_hours: workMinutes / 60,
    gps_coverage_completeness: safeDiv(gps, gpsExpected),
    jobs_completed: jobs,
    visits_completed: visits,
    task_completion_rate: safeDiv(tasksDone, tasksAssigned),
    revenue_per_employee: safeDiv(revenue, active),
    labor_cost_per_output: safeDiv(labor, jobs + visits),
    productivity_score: productivity,
  };

  for (const def of defs) {
    const value = values[def.key] ?? 0;
    await db
      .insert(analyticsMetricResults)
      .values({
        tenantId,
        metricDefinitionId: def.id,
        entityType: "tenant",
        entityId: tenantId,
        dateBucket: day,
        valueNumeric: value,
        valueJson: { inputs: { clocked, active, jobs, visits, revenue } },
        version: def.version,
        generatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [
          analyticsMetricResults.tenantId,
          analyticsMetricResults.metricDefinitionId,
          analyticsMetricResults.entityType,
          analyticsMetricResults.entityId,
          analyticsMetricResults.dateBucket,
          analyticsMetricResults.version,
        ],
        set: {
          valueNumeric: value,
          valueJson: { inputs: { clocked, active, jobs, visits, revenue } },
          generatedAt: new Date(),
        },
      });
  }
}

export async function refreshAllTenantMetrics(db: Db, days = 7) {
  const all = await db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
  });
  for (const tenant of all) {
    const tz = tenant.settings.timezone ?? "UTC";
    const today = todayInZone(tz);
    for (let i = days - 1; i >= 0; i--) {
      await refreshMetricResults(db, tenant.id, addDays(today, -i));
    }
  }
}
