import type { FastifyInstance } from "fastify";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import {
  attendanceRecords,
  employeeLiveLocations,
  employees,
  healthMetrics,
  integrationConnections,
  integrationRawEvents,
  locationPings,
  tenants,
  users,
} from "@hr/db";
import { createNotification } from "./services/notifications.js";
import {
  DEFAULT_INTEGRATION_RAW_RETENTION_DAYS,
} from "@hr/shared";
import { getTenantPlanFeatures, resolveLocationRetentionDays } from "./lib/features.js";
import { expirePastTrials } from "./lib/billing.js";
import { drainPendingRawEvents } from "./integrations/process-raw.js";
import { runConnectionSync } from "./routes/integrations.js";
import {
  materializeOperational,
  materializeStrategic,
} from "./analytics/materialize.js";
import { refreshAllTenantMetrics } from "./analytics/metrics.js";
import { detectAnomalies, detectStaleSyncs } from "./analytics/alerts.js";
import { reconcileAll } from "./analytics/reconcile.js";
import { runLeaveJobsForAllTenants } from "./services/leave.js";
import { runTaskJobsForAllTenants } from "./services/tasks.js";
import { runShiftComplianceJobs } from "./services/shifts.js";

export function startJobs(app: FastifyInstance) {
  const hourMs = 60 * 60 * 1000;
  const minuteMs = 60 * 1000;

  const retention = async () => {
    try {
      const allTenants = await app.db.query.tenants.findMany({
        where: eq(tenants.status, "active"),
      });
      for (const tenant of allTenants) {
        const features = await getTenantPlanFeatures(app.db, tenant.id);
        const days = resolveLocationRetentionDays(
          tenant.settings.locationRetentionDays,
          features,
        );
        const cutoff = new Date(Date.now() - days * 24 * hourMs);
        const deleted = await app.db
          .delete(locationPings)
          .where(
            and(
              eq(locationPings.tenantId, tenant.id),
              lt(locationPings.recordedAt, cutoff),
            ),
          )
          .returning({ id: locationPings.id });
        if (deleted.length) {
          app.log.info(
            { tenantId: tenant.id, purged: deleted.length },
            "purged location pings",
          );
        }

        const rawDays =
          tenant.settings.integrationRawRetentionDays ??
          DEFAULT_INTEGRATION_RAW_RETENTION_DAYS;
        const rawCutoff = new Date(Date.now() - rawDays * 24 * hourMs);
        const rawDeleted = await app.db
          .delete(integrationRawEvents)
          .where(
            and(
              eq(integrationRawEvents.tenantId, tenant.id),
              lt(integrationRawEvents.receivedAt, rawCutoff),
            ),
          )
          .returning({ id: integrationRawEvents.id });
        if (rawDeleted.length) {
          app.log.info(
            { tenantId: tenant.id, purged: rawDeleted.length },
            "purged integration raw events",
          );
        }
      }
    } catch (err) {
      app.log.error(err, "retention job failed");
    }
  };

  const missedClockOuts = async () => {
    try {
      const allTenants = await app.db.query.tenants.findMany({
        where: eq(tenants.status, "active"),
      });
      for (const tenant of allTenants) {
        const hours = tenant.settings.missedClockOutHours ?? 12;
        const cutoff = new Date(Date.now() - hours * hourMs);
        const open = await app.db.query.attendanceRecords.findMany({
          where: and(
            eq(attendanceRecords.tenantId, tenant.id),
            isNull(attendanceRecords.clockOutAt),
            lt(attendanceRecords.clockInAt, cutoff),
          ),
        });
        for (const rec of open) {
          if (rec.anomalyFlags.includes("missed_clock_out")) continue;
          await app.db
            .update(attendanceRecords)
            .set({
              anomalyFlags: [...rec.anomalyFlags, "missed_clock_out"],
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(attendanceRecords.id, rec.id),
                eq(attendanceRecords.tenantId, tenant.id),
              ),
            );

          await app.db
            .update(employeeLiveLocations)
            .set({ isClockedIn: false, updatedAt: new Date() })
            .where(
              and(
                eq(employeeLiveLocations.employeeId, rec.employeeId),
                eq(employeeLiveLocations.tenantId, tenant.id),
              ),
            );

          await app.db.insert(healthMetrics).values({
            tenantId: tenant.id,
            metric: "missed_clock_out",
            value: 1,
            meta: { attendanceId: rec.id, employeeId: rec.employeeId },
          });

          const emp = await app.db.query.employees.findFirst({
            where: eq(employees.id, rec.employeeId),
          });
          if (emp) {
            await createNotification(app, {
              tenantId: tenant.id,
              userId: emp.userId,
              type: "missed_clock_out",
              title: "Missed clock-out",
              body: "You appear to still be clocked in past the expected shift length.",
            });
            if (emp.managerId) {
              const manager = await app.db.query.employees.findFirst({
                where: and(
                  eq(employees.id, emp.managerId),
                  eq(employees.tenantId, tenant.id),
                ),
                columns: { userId: true },
              });
              if (manager?.userId && manager.userId !== emp.userId) {
                const empUser = await app.db.query.users.findFirst({
                  where: eq(users.id, emp.userId),
                  columns: { name: true },
                });
                const who = empUser?.name?.trim() || "A direct report";
                await createNotification(app, {
                  tenantId: tenant.id,
                  userId: manager.userId,
                  type: "missed_clock_out",
                  title: "Team missed clock-out",
                  body: `${who} appears still clocked in past the expected shift length.`,
                  metadata: {
                    employeeId: emp.id,
                    attendanceId: rec.id,
                  },
                });
              }
            }
          }
        }
      }
    } catch (err) {
      app.log.error(err, "missed clock-out job failed");
    }
  };

  const drainRaw = async () => {
    try {
      const n = await drainPendingRawEvents(app.db, 75);
      if (n) app.log.info({ processed: n }, "drained raw integration events");
    } catch (err) {
      app.log.error(err, "raw event drain failed");
    }
  };

  const pollConnections = async () => {
    try {
      const due = await app.db.query.integrationConnections.findMany({
        where: and(
          eq(integrationConnections.status, "active"),
          or(
            eq(integrationConnections.syncMode, "polling"),
            eq(integrationConnections.syncMode, "hybrid"),
          ),
        ),
      });
      const now = Date.now();
      for (const conn of due) {
        const intervalMin = conn.pollIntervalMinutes ?? 15;
        const last = conn.lastSyncAt?.getTime() ?? 0;
        if (now - last < intervalMin * minuteMs) continue;
        await runConnectionSync(app.db, conn, "schedule");
      }
    } catch (err) {
      app.log.error(err, "connector polling failed");
    }
  };

  const operational = async () => {
    try {
      await materializeOperational(app.db);
      await refreshAllTenantMetrics(app.db, 2);
    } catch (err) {
      app.log.error(err, "operational analytics failed");
    }
  };

  const nightly = async () => {
    try {
      await materializeStrategic(app.db);
      await refreshAllTenantMetrics(app.db, 30);
      await detectAnomalies(app.db);
      await detectStaleSyncs(app.db);
      await reconcileAll(app.db);
      await retention();
    } catch (err) {
      app.log.error(err, "nightly analytics failed");
    }
  };

  const leaveMaintenance = async () => {
    try {
      const hour = new Date().getHours();
      // Accrual: daily-ish, prefer 02:00, also every 6 hours as a catch-up.
      const runAccrual = hour === 2 || hour % 6 === 0;
      // Reminders: same cadence; once-per-day dedupe lives in runLeaveReminders.
      const runReminders = runAccrual || hour === 9;
      if (!runAccrual && !runReminders) return;
      await runLeaveJobsForAllTenants(app, { runAccrual, runReminders });
    } catch (err) {
      app.log.error(err, "leave maintenance job failed");
    }
  };

  const taskDueReminders = async () => {
    try {
      const hour = new Date().getHours();
      // Prefer morning + catch-up every 6 hours (once-per-day dedupe in service).
      if (!(hour === 9 || hour % 6 === 0)) return;
      const sent = await runTaskJobsForAllTenants(app);
      if (sent) {
        app.log.info({ sent }, "task due-soon reminders sent");
      }
    } catch (err) {
      app.log.error(err, "task due reminder job failed");
    }
  };

  const expireTrials = async () => {
    try {
      const expired = await expirePastTrials(app.db);
      if (expired.length) {
        app.log.info({ count: expired.length }, "expired past trials");
      }
    } catch (err) {
      app.log.error(err, "trial expiry job failed");
    }
  };

  const shiftCompliance = async () => {
    try {
      await runShiftComplianceJobs(app);
    } catch (err) {
      app.log.error(err, "shift compliance job failed");
    }
  };

  setTimeout(() => {
    void retention();
    void missedClockOuts();
    void drainRaw();
    void operational();
    void leaveMaintenance();
    void taskDueReminders();
    void expireTrials();
    void shiftCompliance();
  }, 5_000);

  setInterval(() => {
    void drainRaw();
  }, 15_000);

  setInterval(() => {
    void pollConnections();
  }, minuteMs);

  setInterval(() => {
    void shiftCompliance();
  }, minuteMs);

  setInterval(() => {
    void operational();
  }, 10 * minuteMs);

  setInterval(() => {
    void missedClockOuts();
  }, hourMs);

  setInterval(() => {
    void leaveMaintenance();
  }, hourMs);

  setInterval(() => {
    void taskDueReminders();
  }, hourMs);

  setInterval(() => {
    void expireTrials();
  }, hourMs);

  setInterval(() => {
    void nightly();
  }, 24 * hourMs);
}
