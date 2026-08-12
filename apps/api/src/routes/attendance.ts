import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  attendanceCorrections,
  attendanceRecords,
  employeeLiveLocations,
  employees,
  locationPings,
} from "@hr/db";
import { clockEventSchema, correctAttendanceSchema } from "@hr/shared";
import type { JwtPayload } from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  requireRoles,
  requireTenantScope,
  tenantIdOf,
} from "../types.js";
import { createNotification } from "../services/notifications.js";
import { broadcastToTenant } from "../ws-hub.js";

export const attendanceRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

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

  app.get("/status", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    if (!user.employeeId) return { clockedIn: false, attendance: null };
    const open = await app.db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.tenantId, tenantId),
        eq(attendanceRecords.employeeId, user.employeeId),
        isNull(attendanceRecords.clockOutAt),
      ),
    });
    return { clockedIn: Boolean(open), attendance: open ?? null };
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
