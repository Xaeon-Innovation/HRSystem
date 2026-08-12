import type { FastifyInstance } from "fastify";
import { and, eq, isNull, lt } from "drizzle-orm";
import {
  attendanceRecords,
  employeeLiveLocations,
  employees,
  healthMetrics,
  locationPings,
  tenants,
} from "@hr/db";
import { createNotification } from "./services/notifications.js";
import { DEFAULT_LOCATION_RETENTION_DAYS } from "@hr/shared";

export function startJobs(app: FastifyInstance) {
  const hourMs = 60 * 60 * 1000;

  const retention = async () => {
    try {
      const allTenants = await app.db.query.tenants.findMany({
        where: eq(tenants.status, "active"),
      });
      for (const tenant of allTenants) {
        const days =
          tenant.settings.locationRetentionDays ??
          DEFAULT_LOCATION_RETENTION_DAYS;
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
          }
        }
      }
    } catch (err) {
      app.log.error(err, "missed clock-out job failed");
    }
  };

  // Run shortly after boot, then hourly
  setTimeout(() => {
    void retention();
    void missedClockOuts();
  }, 5_000);
  setInterval(() => {
    void retention();
    void missedClockOuts();
  }, hourMs);
}
