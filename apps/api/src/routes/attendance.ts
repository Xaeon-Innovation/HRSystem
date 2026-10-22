import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq, gte, inArray, isNull, lt, lte, or } from "drizzle-orm";
import {
  attendanceCorrections,
  attendanceRecords,
  employees,
  shiftInstances,
  tenants,
  users,
} from "@hr/db";
import { clockEventSchema, correctAttendanceSchema } from "@hr/shared";
import type { JwtPayload } from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import { avatarUrlFor } from "../lib/avatar.js";
import {
  computeShiftAndOvertimeMinutes,
  formatLatLng,
} from "../lib/hours-report.js";
import {
  getTenantPlanFeatures,
  planFeatureEnabled,
  resolvePingIntervalSec,
} from "../lib/features.js";
import { todayInZone, zonedDayBounds, formatDayInZone } from "../lib/timezone.js";
import {
  requireModuleRole,
  requireRoles,
  tenantIdOf,
} from "../types.js";
import { requireActiveSubscription } from "../lib/features.js";
import { clockIn, clockOut } from "../services/attendance.js";

export const attendanceRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireActiveSubscription());

  app.post("/clock-in", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const parsed = clockEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const result = await clockIn(app, {
      tenantId,
      user,
      event: parsed.data,
    });
    if (!result.ok) {
      return reply.code(result.status).send(result.body);
    }
    if (result.deduped) {
      return { attendance: result.attendance, deduped: true };
    }
    return reply.code(201).send({ attendance: result.attendance });
  });

  app.post("/clock-out", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const parsed = clockEventSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const result = await clockOut(app, {
      tenantId,
      user,
      event: parsed.data,
    });
    if (!result.ok) {
      return reply.code(result.status).send(result.body);
    }
    if (result.deduped) {
      return { attendance: result.attendance, deduped: true };
    }
    return { attendance: result.attendance };
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

  app.get("/day", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const q = request.query as { date?: string };

    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
    });
    const tz = tenant?.settings.timezone ?? "UTC";
    const dateRaw = q.date?.slice(0, 10) ?? "";
    const day = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw)
      ? dateRaw
      : todayInZone(tz);
    const { start: dayStart, end: dayEnd } = zonedDayBounds(day, tz);

    const isAdmin = user.role === "tenant_admin";
    if (!isAdmin && !user.employeeId) {
      return reply.send({ day, people: [] });
    }

    const roster = await app.db
      .select({
        employeeId: employees.id,
        name: users.name,
        userId: users.id,
        avatarMime: users.avatarMime,
        userUpdatedAt: users.updatedAt,
        presenceMode: employees.presenceMode,
      })
      .from(employees)
      .innerJoin(users, eq(users.id, employees.userId))
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.status, "active"),
          isAdmin ? undefined : eq(employees.id, user.employeeId!),
        ),
      );

    if (roster.length === 0) {
      return { day, people: [] };
    }

    const ids = roster.map((r) => r.employeeId);
    const sessionRows = await app.db.query.attendanceRecords.findMany({
      where: and(
        eq(attendanceRecords.tenantId, tenantId),
        inArray(attendanceRecords.employeeId, ids),
        gte(attendanceRecords.clockInAt, dayStart),
        lt(attendanceRecords.clockInAt, dayEnd),
      ),
      orderBy: [desc(attendanceRecords.clockInAt)],
    });

    const shiftRows = await app.db.query.shiftInstances.findMany({
      where: and(
        eq(shiftInstances.tenantId, tenantId),
        inArray(shiftInstances.employeeId, ids),
        eq(shiftInstances.workDate, day),
        eq(shiftInstances.status, "scheduled"),
      ),
    });

    const sessionsByEmployee = new Map<string, typeof sessionRows>();
    for (const row of sessionRows) {
      const list = sessionsByEmployee.get(row.employeeId) ?? [];
      list.push(row);
      sessionsByEmployee.set(row.employeeId, list);
    }
    const shiftsByEmployee = new Map<string, typeof shiftRows>();
    for (const row of shiftRows) {
      const list = shiftsByEmployee.get(row.employeeId) ?? [];
      list.push(row);
      shiftsByEmployee.set(row.employeeId, list);
    }

    const people = roster
      .map((r) => {
        const presenceMode = r.presenceMode ?? "fixed_zone";
        const sessions = (sessionsByEmployee.get(r.employeeId) ?? []).map(
          (s) => {
            const inLabel =
              presenceMode === "mobile"
                ? formatLatLng(s.clockInLat, s.clockInLng)
                  ? `Mobile · ${formatLatLng(s.clockInLat, s.clockInLng)}`
                  : "Mobile"
                : formatLatLng(s.clockInLat, s.clockInLng);
            const outLabel =
              s.clockOutAt == null
                ? null
                : presenceMode === "mobile"
                  ? formatLatLng(s.clockOutLat, s.clockOutLng)
                    ? `Mobile · ${formatLatLng(s.clockOutLat, s.clockOutLng)}`
                    : "Mobile"
                  : formatLatLng(s.clockOutLat, s.clockOutLng);
            return {
              id: s.id,
              clockInAt:
                s.clockInAt instanceof Date
                  ? s.clockInAt.toISOString()
                  : String(s.clockInAt),
              clockOutAt: s.clockOutAt
                ? s.clockOutAt instanceof Date
                  ? s.clockOutAt.toISOString()
                  : String(s.clockOutAt)
                : null,
              clockInLat: s.clockInLat,
              clockInLng: s.clockInLng,
              clockOutLat: s.clockOutLat,
              clockOutLng: s.clockOutLng,
              clockInPlace: inLabel,
              clockOutPlace: outLabel,
              anomalyFlags: Array.isArray(s.anomalyFlags) ? s.anomalyFlags : [],
            };
          },
        );
        const shifts = (shiftsByEmployee.get(r.employeeId) ?? []).map((sh) => ({
          id: sh.id,
          startAt:
            sh.startAt instanceof Date
              ? sh.startAt.toISOString()
              : String(sh.startAt),
          endAt:
            sh.endAt instanceof Date ? sh.endAt.toISOString() : String(sh.endAt),
        }));
        return {
          employeeId: r.employeeId,
          name: r.name,
          avatarUrl: avatarUrlFor(r.userId, r.avatarMime, r.userUpdatedAt),
          presenceMode,
          shifts,
          sessions,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return { day, people };
  });

  app.get(
    "/hours-report",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const q = request.query as { from?: string; to?: string };
      if (!q.from || !q.to) {
        return reply.code(400).send({ error: "from and to dates are required" });
      }
      const fromDay = q.from.slice(0, 10);
      const toDay = q.to.slice(0, 10);
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(fromDay) ||
        !/^\d{4}-\d{2}-\d{2}$/.test(toDay)
      ) {
        return reply.code(400).send({ error: "Invalid date range" });
      }

      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
      const tz = tenant?.settings.timezone ?? "UTC";
      const { start: rangeStart } = zonedDayBounds(fromDay, tz);
      const { end: rangeEnd } = zonedDayBounds(toDay, tz);

      const roster = await app.db
        .select({
          employeeId: employees.id,
          name: users.name,
        })
        .from(employees)
        .innerJoin(users, eq(users.id, employees.userId))
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.status, "active"),
          ),
        );

      if (roster.length === 0) {
        return { from: fromDay, to: toDay, rows: [], totals: {
          shiftMinutes: 0,
          overtimeMinutes: 0,
          totalWorkMinutes: 0,
        } };
      }

      const ids = roster.map((r) => r.employeeId);
      const sessionRows = await app.db.query.attendanceRecords.findMany({
        where: and(
          eq(attendanceRecords.tenantId, tenantId),
          inArray(attendanceRecords.employeeId, ids),
          gte(attendanceRecords.clockInAt, rangeStart),
          lt(attendanceRecords.clockInAt, rangeEnd),
        ),
      });
      const shiftRows = await app.db.query.shiftInstances.findMany({
        where: and(
          eq(shiftInstances.tenantId, tenantId),
          inArray(shiftInstances.employeeId, ids),
          gte(shiftInstances.workDate, fromDay),
          lte(shiftInstances.workDate, toDay),
          eq(shiftInstances.status, "scheduled"),
        ),
      });

      const nameById = new Map(roster.map((r) => [r.employeeId, r.name]));

      type DayKey = string;
      const dayKeys = new Set<DayKey>();
      const sessionsByEmpDay = new Map<
        DayKey,
        { clockInAt: Date; clockOutAt: Date }[]
      >();
      for (const s of sessionRows) {
        if (!s.clockOutAt) continue;
        const clockIn =
          s.clockInAt instanceof Date ? s.clockInAt : new Date(s.clockInAt);
        const workDay = formatDayInZone(clockIn, tz);
        const key = `${s.employeeId}|${workDay}`;
        dayKeys.add(key);
        const list = sessionsByEmpDay.get(key) ?? [];
        list.push({
          clockInAt: clockIn,
          clockOutAt:
            s.clockOutAt instanceof Date
              ? s.clockOutAt
              : new Date(s.clockOutAt),
        });
        sessionsByEmpDay.set(key, list);
      }
      const shiftsByEmpDay = new Map<
        DayKey,
        { startAt: Date; endAt: Date }[]
      >();
      for (const sh of shiftRows) {
        const key = `${sh.employeeId}|${sh.workDate}`;
        const list = shiftsByEmpDay.get(key) ?? [];
        list.push({
          startAt:
            sh.startAt instanceof Date ? sh.startAt : new Date(sh.startAt),
          endAt: sh.endAt instanceof Date ? sh.endAt : new Date(sh.endAt),
        });
        shiftsByEmpDay.set(key, list);
      }

      const rows: {
        employeeId: string;
        name: string;
        day: string;
        shiftMinutes: number;
        overtimeMinutes: number;
        totalWorkMinutes: number;
      }[] = [];

      let totalShift = 0;
      let totalOt = 0;
      let totalWork = 0;

      for (const key of [...dayKeys].sort()) {
        const [employeeId, day] = key.split("|") as [string, string];
        const computed = computeShiftAndOvertimeMinutes(
          sessionsByEmpDay.get(key) ?? [],
          shiftsByEmpDay.get(key) ?? [],
        );
        totalShift += computed.shiftMinutes;
        totalOt += computed.overtimeMinutes;
        totalWork += computed.totalWorkMinutes;
        rows.push({
          employeeId,
          name: nameById.get(employeeId) ?? "—",
          day,
          ...computed,
        });
      }

      rows.sort((a, b) =>
        a.day === b.day
          ? a.name.localeCompare(b.name)
          : a.day.localeCompare(b.day),
      );

      return {
        from: fromDay,
        to: toDay,
        rows,
        totals: {
          shiftMinutes: totalShift,
          overtimeMinutes: totalOt,
          totalWorkMinutes: totalWork,
        },
      };
    },
  );

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
