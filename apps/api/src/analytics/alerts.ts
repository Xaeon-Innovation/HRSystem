import { and, eq } from "drizzle-orm";
import {
  analyticsAlerts,
  employeeDailyAnalytics,
  integrationConnections,
  tenants,
  type Db,
} from "@hr/db";
import { addDays, todayInZone } from "../lib/timezone.js";

async function openAlert(
  db: Db,
  input: {
    tenantId: string;
    alertType: typeof analyticsAlerts.$inferInsert.alertType;
    severity: typeof analyticsAlerts.$inferInsert.severity;
    entityType: typeof analyticsAlerts.$inferInsert.entityType;
    entityId: string;
    alertDate: string;
    title: string;
    description: string;
    payload?: Record<string, unknown>;
  },
) {
  const existing = await db.query.analyticsAlerts.findFirst({
    where: and(
      eq(analyticsAlerts.tenantId, input.tenantId),
      eq(analyticsAlerts.alertType, input.alertType),
      eq(analyticsAlerts.entityId, input.entityId),
      eq(analyticsAlerts.alertDate, input.alertDate),
      eq(analyticsAlerts.status, "open"),
    ),
  });
  if (existing) return;
  await db.insert(analyticsAlerts).values({
    tenantId: input.tenantId,
    alertType: input.alertType,
    severity: input.severity,
    entityType: input.entityType,
    entityId: input.entityId,
    alertDate: input.alertDate,
    title: input.title,
    description: input.description,
    payloadJson: input.payload ?? {},
    status: "open",
  });
}

export async function detectAnomalies(db: Db) {
  const all = await db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
  });
  for (const tenant of all) {
    const tz = tenant.settings.timezone ?? "UTC";
    const today = todayInZone(tz);
    const yesterday = addDays(today, -1);
    const rows = await db.query.employeeDailyAnalytics.findMany({
      where: and(
        eq(employeeDailyAnalytics.tenantId, tenant.id),
        eq(employeeDailyAnalytics.day, yesterday),
      ),
    });
    const clocked = rows.filter((r) => r.wasClockedIn).length;
    const rate = rows.length ? clocked / rows.length : 1;
    if (rows.length >= 3 && rate < 0.5) {
      await openAlert(db, {
        tenantId: tenant.id,
        alertType: "attendance_drop",
        severity: "high",
        entityType: "tenant",
        entityId: tenant.id,
        alertDate: yesterday,
        title: "Attendance drop",
        description: `Only ${clocked}/${rows.length} active employees clocked in.`,
        payload: { rate },
      });
    }
    for (const row of rows) {
      if (row.anomalyScore >= 0.6 || row.productivityScore < 20) {
        await openAlert(db, {
          tenantId: tenant.id,
          alertType: "low_productivity",
          severity: row.anomalyScore >= 0.6 ? "high" : "medium",
          entityType: "employee",
          entityId: row.employeeId,
          alertDate: yesterday,
          title: "Low productivity",
          description: `Productivity ${row.productivityScore.toFixed(1)} with anomaly ${row.anomalyScore.toFixed(2)}.`,
          payload: {
            productivityScore: row.productivityScore,
            anomalyScore: row.anomalyScore,
          },
        });
      }
    }
  }
}

export async function detectStaleSyncs(db: Db) {
  const all = await db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
  });
  const cutoff = new Date(Date.now() - 6 * 60 * 60 * 1000);
  for (const tenant of all) {
    const tz = tenant.settings.timezone ?? "UTC";
    const today = todayInZone(tz);
    const connections = await db.query.integrationConnections.findMany({
      where: eq(integrationConnections.tenantId, tenant.id),
    });
    for (const conn of connections) {
      if (conn.status === "draft" || conn.status === "paused") continue;
      const failed = conn.status === "error";
      const stale = !conn.lastSyncAt || conn.lastSyncAt < cutoff;
      if (stale || failed) {
        await openAlert(db, {
          tenantId: tenant.id,
          alertType: stale ? "stale_sync" : "sync_failure",
          severity: failed ? "high" : "medium",
          entityType: "connection",
          entityId: conn.id,
          alertDate: today,
          title: failed ? "Integration sync failure" : "Stale integration sync",
          description: conn.lastError ?? `Last sync ${conn.lastSyncAt?.toISOString() ?? "never"}`,
        });
      }
    }
  }
}
