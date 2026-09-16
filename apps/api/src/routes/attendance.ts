import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import {
  attendanceCorrections,
  attendanceRecords,
  employeeLiveLocations,
  employees,
  locationPings,
  tenants,
} from "@hr/db";
import { clockEventSchema, correctAttendanceSchema } from "@hr/shared";
import type { JwtPayload } from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { isInsideGeofence } from "../lib/geo.js";
import {
  getTenantPlanFeatures,
  planFeatureEnabled,
  resolvePingIntervalSec,
} from "../lib/features.js";
import type { App } from "../types.js";
import {
  requireModuleRole,
  requireRoles,
  tenantIdOf,
} from "../types.js";
import { requireActiveSubscription } from "../lib/features.js";
import { createNotification } from "../services/notifications.js";
import { broadcastToTenant } from "../ws-hub.js";
import {
  assertCanClockIn,
  onClockInLinked,
  onClockOutLinked,
} from "../services/shifts.js";

async function assertWithinGeofence(
  app: App,
  tenantId: string,
  employeeId: string,
  point: { lat: number; lng: number },
) {
  const emp = await app.db.query.employees.findFirst({
    where: and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)),
    columns: {
      geofenceLat: true,
      geofenceLng: true,
      geofenceRadiusMeters: true,
    },
  });
  if (
    !emp ||
    emp.geofenceLat == null ||
    emp.geofenceLng == null ||
    emp.geofenceRadiusMeters == null
  ) {
    return null;
  }
  const check = isInsideGeofence(point, {
    lat: emp.geofenceLat,
    lng: emp.geofenceLng,
    radiusMeters: emp.geofenceRadiusMeters,
  });
  if (check.inside) return null;
  return {
    error: "Outside allowed work zone",
    distanceMeters: Math.round(check.distanceMeters),
    allowedRadiusMeters: emp.geofenceRadiusMeters,
  };
}

export const attendanceRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireActiveSubscription());

  app.post("/clock-in", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const parsed = clockEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    if (!user.employeeId) {
      return reply.code(400).send({ error: "No employee profile" });
    }

    if (parsed.data.clientEventId) {
      const existing = await app.db.query.attendanceRecords.findFirst({
        where: and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.clientEventId, parsed.data.clientEventId),
        ),
      });
      if (existing) return { attendance: existing, deduped: true };
    }

    const open = await app.db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.tenantId, tenantId),
        eq(attendanceRecords.employeeId, user.employeeId),
        isNull(attendanceRecords.clockOutAt),
      ),
    });
    if (open) {
      return reply.code(409).send({ error: "Already clocked in", attendance: open });
    }

    const outside = await assertWithinGeofence(app, tenantId, user.employeeId, {
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    });
    if (outside) {
      return reply.code(403).send(outside);
    }

    try {
      await assertCanClockIn(app, tenantId, user.employeeId);
    } catch (err) {
      const status =
        typeof err === "object" &&
        err &&
        "statusCode" in err &&
        typeof (err as { statusCode: unknown }).statusCode === "number"
          ? (err as { statusCode: number }).statusCode
          : 403;
      return reply
        .code(status)
        .send({ error: err instanceof Error ? err.message : "Cannot clock in" });
    }

    const now = new Date();
    const [record] = await app.db
      .insert(attendanceRecords)
      .values({
        tenantId,
        employeeId: user.employeeId,
        clockInAt: now,
        clockInLat: parsed.data.lat,
        clockInLng: parsed.data.lng,
        clientEventId: parsed.data.clientEventId ?? null,
      })
      .returning();

    await onClockInLinked(
      app,
      tenantId,
      user.employeeId,
      record.id,
      now,
    );

    const features = await getTenantPlanFeatures(app.db, tenantId);
    const hasLiveMap = planFeatureEnabled(features, "liveMap");
    const empRow = await app.db.query.employees.findFirst({
      where: and(
        eq(employees.id, user.employeeId),
        eq(employees.tenantId, tenantId),
      ),
      columns: {
        geofenceLat: true,
        geofenceLng: true,
        geofenceRadiusMeters: true,
      },
    });
    const hasGeofence =
      empRow?.geofenceLat != null &&
      empRow?.geofenceLng != null &&
      empRow?.geofenceRadiusMeters != null;
    const complianceTracking = hasGeofence;

    // Live map or compliance: maintain live location for geofence enforcement.
    if (hasLiveMap || complianceTracking) {
      await app.db
        .insert(employeeLiveLocations)
        .values({
          employeeId: user.employeeId,
          tenantId,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          updatedAt: now,
          isClockedIn: true,
        })
        .onConflictDoUpdate({
          target: employeeLiveLocations.employeeId,
          set: {
            lat: parsed.data.lat,
            lng: parsed.data.lng,
            updatedAt: now,
            isClockedIn: true,
            tenantId,
          },
        });

      await app.db.insert(locationPings).values({
        tenantId,
        employeeId: user.employeeId,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        recordedAt: now,
        clientPingId: parsed.data.clientEventId ?? null,
      });

      if (user.role === "employee") {
        broadcastToTenant(tenantId, {
          type: "location.update",
          payload: {
            employeeId: user.employeeId,
            lat: parsed.data.lat,
            lng: parsed.data.lng,
            updatedAt: now.toISOString(),
            isClockedIn: true,
          },
        });
      }
    }

    await createNotification(app, {
      tenantId,
      userId: user.sub,
      type: "clock_in",
      title: "Clocked in",
      body: `You clocked in at ${now.toISOString()}`,
    });

    return reply.code(201).send({ attendance: record });
  });

  app.post("/clock-out", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const parsed = clockEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    if (!user.employeeId) {
      return reply.code(400).send({ error: "No employee profile" });
    }

    const open = await app.db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.tenantId, tenantId),
        eq(attendanceRecords.employeeId, user.employeeId),
        isNull(attendanceRecords.clockOutAt),
      ),
    });
    if (!open) {
      return reply.code(409).send({ error: "Not clocked in" });
    }

    const outside = await assertWithinGeofence(app, tenantId, user.employeeId, {
      lat: parsed.data.lat,
      lng: parsed.data.lng,
    });
    if (outside) {
      return reply.code(403).send(outside);
    }

    const now = new Date();
    const [record] = await app.db
      .update(attendanceRecords)
      .set({
        clockOutAt: now,
        clockOutLat: parsed.data.lat,
        clockOutLng: parsed.data.lng,
        updatedAt: now,
      })
      .where(
        and(
          eq(attendanceRecords.id, open.id),
          eq(attendanceRecords.tenantId, tenantId),
        ),
      )
      .returning();

    await onClockOutLinked(
      app,
      tenantId,
      user.employeeId,
      record.id,
      now,
    );

    const features = await getTenantPlanFeatures(app.db, tenantId);
    const hasLiveMap = planFeatureEnabled(features, "liveMap");
    const empOut = await app.db.query.employees.findFirst({
      where: and(
        eq(employees.id, user.employeeId),
        eq(employees.tenantId, tenantId),
      ),
      columns: {
        geofenceLat: true,
        geofenceLng: true,
        geofenceRadiusMeters: true,
      },
    });
    const complianceOut =
      empOut?.geofenceLat != null &&
      empOut?.geofenceLng != null &&
      empOut?.geofenceRadiusMeters != null;

    if (hasLiveMap || complianceOut) {
      await app.db
        .update(employeeLiveLocations)
        .set({
          isClockedIn: false,
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          updatedAt: now,
        })
        .where(
          and(
            eq(employeeLiveLocations.employeeId, user.employeeId),
            eq(employeeLiveLocations.tenantId, tenantId),
          ),
        );

      await app.db.insert(locationPings).values({
        tenantId,
        employeeId: user.employeeId,
        lat: parsed.data.lat,
        lng: parsed.data.lng,
        recordedAt: now,
        clientPingId: parsed.data.clientEventId ?? null,
      });

      if (user.role === "employee") {
        broadcastToTenant(tenantId, {
          type: "location.update",
          payload: {
            employeeId: user.employeeId,
            lat: parsed.data.lat,
            lng: parsed.data.lng,
            updatedAt: now.toISOString(),
            isClockedIn: false,
          },
        });
      }
    }

    await createNotification(app, {
      tenantId,
      userId: user.sub,
      type: "clock_out",
      title: "Clocked out",
      body: `You clocked out at ${now.toISOString()}`,
    });

    return { attendance: record };
  });

  app.get("/history", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const q = request.query as { employeeId?: string };
    const employeeId =
      user.role === "tenant_admin" && q.employeeId
        ? q.employeeId
        : user.employeeId;

    const rows = await app.db.query.attendanceRecords.findMany({
      where: and(
        eq(attendanceRecords.tenantId, tenantId),
        employeeId
          ? eq(attendanceRecords.employeeId, employeeId)
          : undefined,
      ),
      orderBy: [desc(attendanceRecords.clockInAt)],
      limit: 100,
    });
    return { records: rows };
  });

  app.get(
    "/period",
    { preHandler: requireModuleRole("compensation") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const q = request.query as {
        from?: string;
        to?: string;
        employeeId?: string;
      };
      if (!q.from || !q.to) {
        return reply.code(400).send({ error: "from and to dates are required" });
      }
      const from = new Date(`${q.from.slice(0, 10)}T00:00:00.000Z`);
      const to = new Date(`${q.to.slice(0, 10)}T23:59:59.999Z`);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
        return reply.code(400).send({ error: "Invalid date range" });
      }

      const rows = await app.db.query.attendanceRecords.findMany({
        where: and(
          eq(attendanceRecords.tenantId, tenantId),
          q.employeeId
            ? eq(attendanceRecords.employeeId, q.employeeId)
            : undefined,
          or(
            and(
              gte(attendanceRecords.clockInAt, from),
              lte(attendanceRecords.clockInAt, to),
            ),
            and(
              isNull(attendanceRecords.clockOutAt),
              lte(attendanceRecords.clockInAt, to),
            ),
          ),
        ),
        orderBy: [desc(attendanceRecords.clockInAt)],
        limit: 5000,
      });

      return {
        from: q.from.slice(0, 10),
        to: q.to.slice(0, 10),
        records: rows.map((r) => ({
          id: r.id,
          employeeId: r.employeeId,
          clockInAt:
            r.clockInAt instanceof Date ? r.clockInAt.toISOString() : r.clockInAt,
          clockOutAt: r.clockOutAt
            ? r.clockOutAt instanceof Date
              ? r.clockOutAt.toISOString()
              : r.clockOutAt
            : null,
        })),
      };
    },
  );

  app.get("/status", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const features = await getTenantPlanFeatures(app.db, tenantId);
    const liveTracking = planFeatureEnabled(features, "liveMap");
    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { settings: true },
    });
    const pingIntervalSec = resolvePingIntervalSec(
      tenant?.settings.pingIntervalSec,
      features,
    );
    if (!user.employeeId) {
      return {
        clockedIn: false,
        attendance: null,
        liveTracking,
        complianceTracking: false,
        pingIntervalSec,
      };
    }
    const open = await app.db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.tenantId, tenantId),
        eq(attendanceRecords.employeeId, user.employeeId),
        isNull(attendanceRecords.clockOutAt),
      ),
    });
    const emp = await app.db.query.employees.findFirst({
      where: and(
        eq(employees.id, user.employeeId),
        eq(employees.tenantId, tenantId),
      ),
      columns: {
        geofenceLat: true,
        geofenceLng: true,
        geofenceRadiusMeters: true,
      },
    });
    const hasGeofence =
      emp?.geofenceLat != null &&
      emp?.geofenceLng != null &&
      emp?.geofenceRadiusMeters != null;
    const complianceTracking = Boolean(open) && hasGeofence;
    return {
      clockedIn: Boolean(open),
      attendance: open ?? null,
      liveTracking,
      complianceTracking,
      pingIntervalSec,
    };
  });

  app.patch(
    "/:id/correct",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;
      const { id } = request.params as { id: string };
      const parsed = correctAttendanceSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }

      const current = await app.db.query.attendanceRecords.findFirst({
        where: and(
          eq(attendanceRecords.id, id),
          eq(attendanceRecords.tenantId, tenantId),
        ),
      });
      if (!current) return reply.code(404).send({ error: "Not found" });

      const before = {
        clockInAt: current.clockInAt,
        clockOutAt: current.clockOutAt,
      };
      const after = {
        clockInAt: parsed.data.clockInAt
          ? new Date(parsed.data.clockInAt)
          : current.clockInAt,
        clockOutAt:
          parsed.data.clockOutAt === undefined
            ? current.clockOutAt
            : parsed.data.clockOutAt
              ? new Date(parsed.data.clockOutAt)
              : null,
      };

      const [updated] = await app.db
        .update(attendanceRecords)
        .set({
          clockInAt: after.clockInAt,
          clockOutAt: after.clockOutAt,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(attendanceRecords.id, id),
            eq(attendanceRecords.tenantId, tenantId),
          ),
        )
        .returning();

      await app.db.insert(attendanceCorrections).values({
        tenantId,
        attendanceId: id,
        correctedByUserId: user.sub,
        before,
        after,
        note: parsed.data.note,
      });

      await writeAudit(app, {
        actor: user,
        action: "attendance.correct",
        tenantId,
        resourceType: "attendance",
        resourceId: id,
        metadata: { before, after, note: parsed.data.note },
        request,
      });

      return { attendance: updated };
    },
  );

  app.get(
    "/open",
    { preHandler: requireRoles("tenant_admin") },
    async (request) => {
      const tenantId = tenantIdOf(request);
      const rows = await app.db
        .select({
          id: attendanceRecords.id,
          employeeId: attendanceRecords.employeeId,
          clockInAt: attendanceRecords.clockInAt,
        })
        .from(attendanceRecords)
        .innerJoin(
          employees,
          eq(employees.id, attendanceRecords.employeeId),
        )
        .where(
          and(
            eq(attendanceRecords.tenantId, tenantId),
            isNull(attendanceRecords.clockOutAt),
          ),
        );
      return { open: rows };
    },
  );
};
