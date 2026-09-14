import type { FastifyPluginAsync } from "fastify";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import {
  attendanceRecords,
  employeeLiveLocations,
  employees,
  locationPings,
  tenants,
  users,
} from "@hr/db";
import {
  resolveMapAppearance,
  updateMapAppearanceSchema,
  type JwtPayload,
  type MapAppearance,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { avatarUrlFor } from "../lib/avatar.js";
import {
  getTenantPlanFeatures,
  requirePlanFeature,
  resolveLocationRetentionDays,
} from "../lib/features.js";
import { requireRoles, requireTenantScope, tenantIdOf } from "../types.js";

const MAX_HISTORY_MS = 24 * 60 * 60 * 1000;

export const liveMapRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());
  app.addHook("preHandler", requirePlanFeature("fieldOps"));
  app.addHook("preHandler", requireRoles("tenant_admin"));

  app.get("/map-settings", async (request) => {
    const tenantId = tenantIdOf(request);
    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    return {
      map: resolveMapAppearance(tenant?.settings.map as Partial<MapAppearance>),
    };
  });

  app.patch("/map-settings", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const parsed = updateMapAppearanceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    if (!tenant) return reply.code(404).send({ error: "Not found" });

    const previous = resolveMapAppearance(
      tenant.settings.map as Partial<MapAppearance>,
    );
    const next = resolveMapAppearance({ ...previous, ...parsed.data });

    const [updated] = await app.db
      .update(tenants)
      .set({
        settings: { ...tenant.settings, map: next },
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId))
      .returning();

    const actor = request.user as JwtPayload;
    await writeAudit(app, {
      actor,
      action: "tenant.map_settings.update",
      tenantId,
      resourceType: "tenant",
      resourceId: tenantId,
      metadata: { before: previous, after: next },
      request,
    });

    return {
      map: resolveMapAppearance(updated.settings.map as Partial<MapAppearance>),
    };
  });

  app.get("/live-map", async (request) => {
    const tenantId = tenantIdOf(request);
    const q = request.query as {
      role?: string;
      status?: string;
      q?: string;
      presence?: string;
    };
    const presence = q.presence ?? "all";

    const presenceFilter =
      presence === "on_shift"
        ? eq(employeeLiveLocations.isClockedIn, true)
        : presence === "last_seen"
          ? eq(employeeLiveLocations.isClockedIn, false)
          : undefined;

    const rows = await app.db
      .select({
        employeeId: employeeLiveLocations.employeeId,
        lat: employeeLiveLocations.lat,
        lng: employeeLiveLocations.lng,
        updatedAt: employeeLiveLocations.updatedAt,
        isClockedIn: employeeLiveLocations.isClockedIn,
        name: users.name,
        role: users.role,
        jobTitle: employees.jobTitle,
        status: employees.status,
        userId: users.id,
        avatarMime: users.avatarMime,
        userUpdatedAt: users.updatedAt,
        geofenceLat: employees.geofenceLat,
        geofenceLng: employees.geofenceLng,
        geofenceRadiusMeters: employees.geofenceRadiusMeters,
      })
      .from(employeeLiveLocations)
      .innerJoin(
        employees,
        eq(employees.id, employeeLiveLocations.employeeId),
      )
      .innerJoin(users, eq(users.id, employees.userId))
      .where(
        and(
          eq(employeeLiveLocations.tenantId, tenantId),
          // Live map is for field employees only, never show tenant admins
          eq(users.role, "employee"),
          presenceFilter,
          q.status
            ? eq(employees.status, q.status as "active" | "inactive")
            : undefined,
        ),
      );

    const filtered = q.q
      ? rows.filter(
          (r) =>
            r.name.toLowerCase().includes(q.q!.toLowerCase()) ||
            (r.jobTitle ?? "").toLowerCase().includes(q.q!.toLowerCase()),
        )
      : rows;

    return {
      locations: filtered.map((r) => {
        const { avatarMime, userUpdatedAt, userId, ...rest } = r;
        return {
          ...rest,
          avatarUrl: avatarUrlFor(userId, avatarMime, userUpdatedAt),
          secondsSinceUpdate: Math.floor(
            (Date.now() - new Date(r.updatedAt).getTime()) / 1000,
          ),
        };
      }),
      polledAt: new Date().toISOString(),
    };
  });

  app.get("/location-history", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const q = request.query as {
      employeeId?: string;
      from?: string;
      to?: string;
    };

    if (!q.employeeId || !q.from || !q.to) {
      return reply
        .code(400)
        .send({ error: "employeeId, from, and to are required" });
    }

    const from = new Date(q.from);
    const to = new Date(q.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      return reply.code(400).send({ error: "Invalid from/to datetime" });
    }
    if (to.getTime() < from.getTime()) {
      return reply.code(400).send({ error: "to must be >= from" });
    }
    if (to.getTime() - from.getTime() > MAX_HISTORY_MS) {
      return reply
        .code(400)
        .send({ error: "Range must be at most 24 hours" });
    }

    const emp = await app.db
      .select({
        id: employees.id,
        name: users.name,
        jobTitle: employees.jobTitle,
        userId: users.id,
        avatarMime: users.avatarMime,
        userUpdatedAt: users.updatedAt,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(
        and(eq(employees.id, q.employeeId), eq(employees.tenantId, tenantId)),
      )
      .limit(1);

    if (!emp[0]) {
      return reply.code(404).send({ error: "Employee not found" });
    }

    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    const features = await getTenantPlanFeatures(app.db, tenantId);
    const retentionDays = resolveLocationRetentionDays(
      tenant?.settings.locationRetentionDays,
      features,
    );

    const points = await app.db
      .select({
        lat: locationPings.lat,
        lng: locationPings.lng,
        recordedAt: locationPings.recordedAt,
      })
      .from(locationPings)
      .where(
        and(
          eq(locationPings.tenantId, tenantId),
          eq(locationPings.employeeId, q.employeeId),
          gte(locationPings.recordedAt, from),
          lte(locationPings.recordedAt, to),
        ),
      )
      .orderBy(asc(locationPings.recordedAt));

    const { avatarMime, userUpdatedAt, userId, ...employeeRest } = emp[0];
    return {
      employee: {
        ...employeeRest,
        avatarUrl: avatarUrlFor(userId, avatarMime, userUpdatedAt),
      },
      from: from.toISOString(),
      to: to.toISOString(),
      points: points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        recordedAt: p.recordedAt.toISOString(),
      })),
      pointCount: points.length,
      retentionDays,
    };
  });

  app.get("/location-sessions", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const q = request.query as { employeeId?: string; date?: string };

    if (!q.employeeId || !q.date) {
      return reply
        .code(400)
        .send({ error: "employeeId and date (YYYY-MM-DD) are required" });
    }

    const dayMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(q.date);
    if (!dayMatch) {
      return reply.code(400).send({ error: "date must be YYYY-MM-DD" });
    }

    const emp = await app.db.query.employees.findFirst({
      where: and(
        eq(employees.id, q.employeeId),
        eq(employees.tenantId, tenantId),
      ),
    });
    if (!emp) {
      return reply.code(404).send({ error: "Employee not found" });
    }

    // Interpret date as UTC calendar day for consistent API behavior
    const dayStart = new Date(`${q.date}T00:00:00.000Z`);
    const dayEnd = new Date(`${q.date}T23:59:59.999Z`);

    const sessions = await app.db
      .select({
        id: attendanceRecords.id,
        clockInAt: attendanceRecords.clockInAt,
        clockOutAt: attendanceRecords.clockOutAt,
      })
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.tenantId, tenantId),
          eq(attendanceRecords.employeeId, q.employeeId),
          gte(attendanceRecords.clockInAt, dayStart),
          lte(attendanceRecords.clockInAt, dayEnd),
        ),
      )
      .orderBy(asc(attendanceRecords.clockInAt));

    return {
      employeeId: q.employeeId,
      date: q.date,
      sessions: sessions.map((s) => ({
        id: s.id,
        clockInAt: s.clockInAt.toISOString(),
        clockOutAt: s.clockOutAt ? s.clockOutAt.toISOString() : null,
      })),
    };
  });
};
