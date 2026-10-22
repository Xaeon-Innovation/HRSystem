import { and, desc, eq, isNull } from "drizzle-orm";
import {
  attendanceRecords,
  employees,
  locationPings,
} from "@hr/db";
import type { ClockEventInput, JwtPayload } from "@hr/shared";
import { isInsideGeofence } from "../lib/geo.js";
import {
  getTenantPlanFeatures,
  planFeatureEnabled,
} from "../lib/features.js";
import type { App } from "../types.js";
import { createNotification } from "./notifications.js";
import {
  broadcastLocationUpdate,
  insertLocationPing,
  markLiveLocationClockedOut,
  upsertLiveLocationClockedIn,
} from "./location.js";
import {
  assertCanClockIn,
  onClockInLinked,
  onClockOutLinked,
} from "./shifts.js";

export type GeofenceReject = {
  error: string;
  distanceMeters: number;
  allowedRadiusMeters: number;
};

export async function assertWithinGeofence(
  app: App,
  tenantId: string,
  employeeId: string,
  point: { lat: number; lng: number },
): Promise<GeofenceReject | null> {
  const emp = await app.db.query.employees.findFirst({
    where: and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)),
    columns: {
      presenceMode: true,
      geofenceLat: true,
      geofenceLng: true,
      geofenceRadiusMeters: true,
    },
  });
  if (!emp || emp.presenceMode === "mobile") {
    return null;
  }
  if (
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

async function employeeHasGeofence(
  app: App,
  tenantId: string,
  employeeId: string,
): Promise<boolean> {
  const emp = await app.db.query.employees.findFirst({
    where: and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)),
    columns: {
      geofenceLat: true,
      geofenceLng: true,
      geofenceRadiusMeters: true,
    },
  });
  return (
    emp?.geofenceLat != null &&
    emp?.geofenceLng != null &&
    emp?.geofenceRadiusMeters != null
  );
}

export type ClockInResult =
  | { ok: true; attendance: typeof attendanceRecords.$inferSelect; deduped?: boolean; status: 200 | 201 }
  | { ok: false; status: number; body: Record<string, unknown> };

export async function clockIn(
  app: App,
  input: {
    tenantId: string;
    user: JwtPayload;
    event: ClockEventInput;
  },
): Promise<ClockInResult> {
  const { tenantId, user, event } = input;
  if (!user.employeeId) {
    return { ok: false, status: 400, body: { error: "No employee profile" } };
  }

  if (event.clientEventId) {
    const existing = await app.db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.tenantId, tenantId),
        eq(attendanceRecords.clientEventId, event.clientEventId),
      ),
    });
    if (existing) {
      return { ok: true, attendance: existing, deduped: true, status: 200 };
    }
  }

  const open = await app.db.query.attendanceRecords.findFirst({
    where: and(
      eq(attendanceRecords.tenantId, tenantId),
      eq(attendanceRecords.employeeId, user.employeeId),
      isNull(attendanceRecords.clockOutAt),
    ),
  });
  if (open) {
    return {
      ok: false,
      status: 409,
      body: { error: "Already clocked in", attendance: open },
    };
  }

  const outside = await assertWithinGeofence(app, tenantId, user.employeeId, {
    lat: event.lat,
    lng: event.lng,
  });
  if (outside) {
    return { ok: false, status: 403, body: outside };
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
    return {
      ok: false,
      status,
      body: { error: err instanceof Error ? err.message : "Cannot clock in" },
    };
  }

  const now = new Date();
  const [record] = await app.db
    .insert(attendanceRecords)
    .values({
      tenantId,
      employeeId: user.employeeId,
      clockInAt: now,
      clockInLat: event.lat,
      clockInLng: event.lng,
      clientEventId: event.clientEventId ?? null,
    })
    .returning();

  await onClockInLinked(app, tenantId, user.employeeId, record.id, now);

  const features = await getTenantPlanFeatures(app.db, tenantId);
  const hasLiveMap = planFeatureEnabled(features, "liveMap");
  const complianceTracking = await employeeHasGeofence(
    app,
    tenantId,
    user.employeeId,
  );

  if (hasLiveMap || complianceTracking) {
    const point = {
      tenantId,
      employeeId: user.employeeId,
      lat: event.lat,
      lng: event.lng,
      recordedAt: now,
      clientPingId: event.clientEventId ?? null,
    };
    await upsertLiveLocationClockedIn(app, point);
    await insertLocationPing(app, point);

    if (user.role === "employee") {
      broadcastLocationUpdate(tenantId, {
        employeeId: user.employeeId,
        lat: event.lat,
        lng: event.lng,
        updatedAt: now.toISOString(),
        isClockedIn: true,
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

  return { ok: true, attendance: record, status: 201 };
}

export type ClockOutResult =
  | { ok: true; attendance: typeof attendanceRecords.$inferSelect; deduped?: boolean }
  | { ok: false; status: number; body: Record<string, unknown> };

export async function clockOut(
  app: App,
  input: {
    tenantId: string;
    user: JwtPayload;
    event: ClockEventInput;
  },
): Promise<ClockOutResult> {
  const { tenantId, user, event } = input;
  if (!user.employeeId) {
    return { ok: false, status: 400, body: { error: "No employee profile" } };
  }

  // Idempotent retry: prior clock-out wrote a ping with this clientEventId.
  if (event.clientEventId) {
    const priorPing = await app.db.query.locationPings.findFirst({
      where: and(
        eq(locationPings.tenantId, tenantId),
        eq(locationPings.employeeId, user.employeeId),
        eq(locationPings.clientPingId, event.clientEventId),
      ),
    });
    if (priorPing) {
      const closed = await app.db.query.attendanceRecords.findFirst({
        where: and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.employeeId, user.employeeId),
        ),
        orderBy: [desc(attendanceRecords.clockOutAt)],
      });
      if (closed?.clockOutAt) {
        return { ok: true, attendance: closed, deduped: true };
      }
    }
  }

  const open = await app.db.query.attendanceRecords.findFirst({
    where: and(
      eq(attendanceRecords.tenantId, tenantId),
      eq(attendanceRecords.employeeId, user.employeeId),
      isNull(attendanceRecords.clockOutAt),
    ),
  });
  if (!open) {
    return { ok: false, status: 409, body: { error: "Not clocked in" } };
  }

  const outside = await assertWithinGeofence(app, tenantId, user.employeeId, {
    lat: event.lat,
    lng: event.lng,
  });
  if (outside) {
    return { ok: false, status: 403, body: outside };
  }

  const now = new Date();
  const [record] = await app.db
    .update(attendanceRecords)
    .set({
      clockOutAt: now,
      clockOutLat: event.lat,
      clockOutLng: event.lng,
      updatedAt: now,
    })
    .where(
      and(
        eq(attendanceRecords.id, open.id),
        eq(attendanceRecords.tenantId, tenantId),
      ),
    )
    .returning();

  await onClockOutLinked(app, tenantId, user.employeeId, record.id, now);

  const features = await getTenantPlanFeatures(app.db, tenantId);
  const hasLiveMap = planFeatureEnabled(features, "liveMap");
  const complianceOut = await employeeHasGeofence(
    app,
    tenantId,
    user.employeeId,
  );

  if (hasLiveMap || complianceOut) {
    const point = {
      tenantId,
      employeeId: user.employeeId,
      lat: event.lat,
      lng: event.lng,
      recordedAt: now,
      clientPingId: event.clientEventId ?? null,
    };
    await markLiveLocationClockedOut(app, point);
    await insertLocationPing(app, point);

    if (user.role === "employee") {
      broadcastLocationUpdate(tenantId, {
        employeeId: user.employeeId,
        lat: event.lat,
        lng: event.lng,
        updatedAt: now.toISOString(),
        isClockedIn: false,
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

  return { ok: true, attendance: record };
}
