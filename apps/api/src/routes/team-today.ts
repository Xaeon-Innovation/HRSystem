import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { and, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import {
  attendanceRecords,
  employees,
  leaveStates,
  tenants,
  users,
} from "@hr/db";
import {
  DEFAULT_LATENESS_GRACE_MINUTES,
  DEFAULT_SHIFT_START_HOUR,
  hasSystemModuleRole,
  type JwtPayload,
} from "@hr/shared";
import { todayInZone, zonedDayBounds } from "../lib/timezone.js";
import { authenticate, requireTenantScope, tenantIdOf } from "../types.js";

type TeamStatus = "clocked_in" | "clocked_out" | "on_leave" | "unknown";

type TeamTodayMember = {
  id: string;
  name: string;
  status: TeamStatus;
  clockInAt?: string | null;
  late?: boolean;
  missedClockOut?: boolean;
};

function coversToday(
  startDate: string,
  endDate: string,
  today: string,
): boolean {
  return startDate <= today && endDate >= today;
}

async function assertTeamTodayAccess(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  await authenticate(request, reply);
  if (reply.sent) return;
  const user = request.user as JwtPayload;
  if (user.role === "tenant_admin") return;
  if (
    hasSystemModuleRole(user, "leaves") ||
    hasSystemModuleRole(user, "kpis")
  ) {
    return;
  }
  if (!user.employeeId || !user.tenantId) {
    return reply.code(403).send({ error: "Forbidden" });
  }
  const managed = await app.db
    .select({ id: employees.id })
    .from(employees)
    .where(
      and(
        eq(employees.tenantId, user.tenantId),
        eq(employees.managerId, user.employeeId),
        eq(employees.status, "active"),
      ),
    )
    .limit(1);
  if (managed.length === 0) {
    return reply.code(403).send({ error: "Forbidden" });
  }
}

export const teamTodayRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

  app.get(
    "/team-today",
    {
      preHandler: async (request, reply) => {
        await assertTeamTodayAccess(app, request, reply);
      },
    },
    async (request) => {
      const tenantId = tenantIdOf(request);
      const user = request.user as JwtPayload;

      const tenant = await app.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });
      const tz = tenant?.settings.timezone ?? "UTC";
      const shiftStart =
        tenant?.settings.shiftStartHour ?? DEFAULT_SHIFT_START_HOUR;
      const grace =
        tenant?.settings.latenessGraceMinutes ?? DEFAULT_LATENESS_GRACE_MINUTES;
      const today = todayInZone(tz);
      const { start: dayStart, end: dayEnd } = zonedDayBounds(today, tz);
      const expectedStart = new Date(
        dayStart.getTime() + (shiftStart * 60 + grace) * 60_000,
      );

      const isAdmin = user.role === "tenant_admin";
      const rosterRows = await app.db
        .select({
          id: employees.id,
          name: users.name,
        })
        .from(employees)
        .innerJoin(users, eq(users.id, employees.userId))
        .where(
          and(
            eq(employees.tenantId, tenantId),
            eq(employees.status, "active"),
            isAdmin
              ? sql`true`
              : user.employeeId
                ? eq(employees.managerId, user.employeeId)
                : sql`false`,
          ),
        );

      if (rosterRows.length === 0) {
        return { team: [] as TeamTodayMember[], day: today };
      }

      const ids = rosterRows.map((r) => r.id);

      const openRecords = await app.db.query.attendanceRecords.findMany({
        where: and(
          eq(attendanceRecords.tenantId, tenantId),
          inArray(attendanceRecords.employeeId, ids),
          isNull(attendanceRecords.clockOutAt),
        ),
      });
      const openByEmployee = new Map(
        openRecords.map((r) => [r.employeeId, r]),
      );

      const todaysRecords = await app.db.query.attendanceRecords.findMany({
        where: and(
          eq(attendanceRecords.tenantId, tenantId),
          inArray(attendanceRecords.employeeId, ids),
          gte(attendanceRecords.clockInAt, dayStart),
          lt(attendanceRecords.clockInAt, dayEnd),
        ),
      });
      const todayByEmployee = new Map<string, (typeof todaysRecords)[0]>();
      for (const rec of todaysRecords) {
        const prev = todayByEmployee.get(rec.employeeId);
        if (!prev || rec.clockInAt < prev.clockInAt) {
          todayByEmployee.set(rec.employeeId, rec);
        }
      }

      const onLeave = new Set<string>();
      try {
        const leaveRow = await app.db.query.leaveStates.findFirst({
          where: eq(leaveStates.tenantId, tenantId),
        });
        const requests = leaveRow?.snapshot?.requests;
        if (Array.isArray(requests)) {
          for (const raw of requests) {
            if (!raw || typeof raw !== "object") continue;
            const req = raw as {
              employeeId?: string;
              status?: string;
              startDate?: string;
              endDate?: string;
            };
            if (
              req.status === "approved" &&
              typeof req.employeeId === "string" &&
              typeof req.startDate === "string" &&
              typeof req.endDate === "string" &&
              coversToday(req.startDate, req.endDate, today)
            ) {
              onLeave.add(req.employeeId);
            }
          }
        }
      } catch {
        /* leave snapshot optional */
      }

      const team: TeamTodayMember[] = rosterRows.map((row) => {
        const open = openByEmployee.get(row.id);
        const todayRec = todayByEmployee.get(row.id);
        const clockSource = open ?? todayRec;
        const clockInAt = clockSource?.clockInAt?.toISOString() ?? null;
        const late = Boolean(
          clockSource?.clockInAt &&
            clockSource.clockInAt >= dayStart &&
            clockSource.clockInAt < dayEnd &&
            clockSource.clockInAt > expectedStart,
        );
        const missedClockOut = Boolean(
          open?.anomalyFlags?.includes("missed_clock_out") ||
            todayRec?.anomalyFlags?.includes("missed_clock_out"),
        );

        let status: TeamStatus = "unknown";
        if (onLeave.has(row.id)) {
          status = "on_leave";
        } else if (open) {
          status = "clocked_in";
        } else if (todayRec) {
          status = "clocked_out";
        }

        const member: TeamTodayMember = {
          id: row.id,
          name: row.name,
          status,
        };
        if (clockInAt) member.clockInAt = clockInAt;
        if (late) member.late = true;
        if (missedClockOut) member.missedClockOut = true;
        return member;
      });

      team.sort((a, b) => a.name.localeCompare(b.name));
      return { team, day: today };
    },
  );
};
