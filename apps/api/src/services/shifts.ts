import { and, eq, gte, isNull, lte, ne, or, sql } from "drizzle-orm";
import {
  attendanceRecords,
  breakPolicies,
  breakSessions,
  employeeLiveLocations,
  employees,
  leftZoneIncidents,
  shiftInstances,
  shiftPatterns,
  tenants,
  users,
  type TenantSettings,
} from "@hr/db";
import {
  DEFAULT_LATENESS_GRACE_MINUTES,
  SHIFT_MATERIALIZE_HORIZON_DAYS,
  type CreateShiftPatternInput,
  type JwtPayload,
  type LeftZoneIncidentResolution,
  type LeftZonePhase,
  type LeftZoneResolution,
  type UpdateShiftPatternInput,
  type UpsertBreakPolicyInput,
} from "@hr/shared";
import type { App } from "../types.js";
import {
  addDays,
  todayInZone,
  zonedStartOfDay,
} from "../lib/timezone.js";
import { isInsideGeofence } from "../lib/geo.js";
import { createNotification } from "./notifications.js";
import { broadcastToTenant } from "../ws-hub.js";

function httpErr(statusCode: number, message: string) {
  const err = new Error(message) as Error & { statusCode: number };
  err.statusCode = statusCode;
  return err;
}

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map(Number);
  return { h, m };
}

/** Combine YYYY-MM-DD + HH:MM in a timezone into a Date. */
export function zonedDateTime(
  day: string,
  hm: string,
  timeZone: string,
): Date {
  const start = zonedStartOfDay(day, timeZone);
  const { h, m } = parseHm(hm);
  return new Date(start.getTime() + (h * 60 + m) * 60_000);
}

function weekdayInZone(day: string, timeZone: string): number {
  const noon = zonedDateTime(day, "12:00", timeZone);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(noon);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(short);
}

function dayOfMonth(day: string): number {
  return Number(day.slice(8, 10));
}

export function graceMs(settings: TenantSettings | null | undefined) {
  return (
    (settings?.latenessGraceMinutes ?? DEFAULT_LATENESS_GRACE_MINUTES) *
    60 *
    1000
  );
}

export async function tenantTimezone(app: App, tenantId: string) {
  const tenant = await app.db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { settings: true },
  });
  return {
    tz: tenant?.settings.timezone ?? "UTC",
    settings: tenant?.settings ?? {},
  };
}

export function assertDailyDayBefore(
  workDate: string,
  tz: string,
  cadence: string,
) {
  if (cadence !== "daily") return;
  const today = todayInZone(tz);
  if (workDate <= today) {
    throw httpErr(
      400,
      "Daily shifts must be set before the work day (day-before rule)",
    );
  }
}

function patternMatchesDay(
  pattern: {
    cadence: string;
    workDate: string | null;
    weekdays: number[];
    monthDays: number[];
    effectiveFrom: string | null;
    effectiveUntil: string | null;
  },
  day: string,
  tz: string,
): boolean {
  if (pattern.effectiveFrom && day < pattern.effectiveFrom) return false;
  if (pattern.effectiveUntil && day > pattern.effectiveUntil) return false;
  if (pattern.cadence === "daily") return pattern.workDate === day;
  if (pattern.cadence === "weekly") {
    const wd = weekdayInZone(day, tz);
    return pattern.weekdays.includes(wd);
  }
  if (pattern.cadence === "monthly") {
    return pattern.monthDays.includes(dayOfMonth(day));
  }
  return false;
}

export async function materializeShiftPatterns(
  app: App,
  tenantId?: string,
  horizonDays = SHIFT_MATERIALIZE_HORIZON_DAYS,
) {
  const tenantRows = tenantId
    ? await app.db.query.tenants.findMany({
        where: eq(tenants.id, tenantId),
      })
    : await app.db.query.tenants.findMany({
        where: eq(tenants.status, "active"),
      });

  let created = 0;
  for (const tenant of tenantRows) {
    const tz = tenant.settings.timezone ?? "UTC";
    const today = todayInZone(tz);
    const patterns = await app.db.query.shiftPatterns.findMany({
      where: and(
        eq(shiftPatterns.tenantId, tenant.id),
        eq(shiftPatterns.active, true),
      ),
    });
    for (const pattern of patterns) {
      const days: string[] = [];
      if (pattern.cadence === "daily" && pattern.workDate) {
        days.push(pattern.workDate);
      } else {
        for (let i = 0; i <= horizonDays; i++) {
          const day = addDays(today, i);
          if (
            patternMatchesDay(
              {
                cadence: pattern.cadence,
                workDate: pattern.workDate,
                weekdays: pattern.weekdays ?? [],
                monthDays: pattern.monthDays ?? [],
                effectiveFrom: pattern.effectiveFrom,
                effectiveUntil: pattern.effectiveUntil,
              },
              day,
              tz,
            )
          ) {
            days.push(day);
          }
        }
      }
      for (const day of days) {
        const startAt = zonedDateTime(day, pattern.startTime, tz);
        let endAt = zonedDateTime(day, pattern.endTime, tz);
        if (endAt <= startAt) {
          endAt = new Date(endAt.getTime() + 24 * 60 * 60 * 1000);
        }
        const existing = await app.db.query.shiftInstances.findFirst({
          where: and(
            eq(shiftInstances.tenantId, tenant.id),
            eq(shiftInstances.employeeId, pattern.employeeId),
            eq(shiftInstances.workDate, day),
          ),
        });
        if (existing) {
          if (
            existing.status === "scheduled" &&
            existing.patternId === pattern.id &&
            !existing.attendanceRecordId
          ) {
            await app.db
              .update(shiftInstances)
              .set({
                startAt,
                endAt,
                updatedAt: new Date(),
              })
              .where(eq(shiftInstances.id, existing.id));
          }
          continue;
        }
        await app.db.insert(shiftInstances).values({
          tenantId: tenant.id,
          employeeId: pattern.employeeId,
          patternId: pattern.id,
          workDate: day,
          startAt,
          endAt,
          status: "scheduled",
        });
        created += 1;
      }
    }
  }
  return { created };
}

export async function createShiftPattern(
  app: App,
  tenantId: string,
  actor: JwtPayload,
  input: CreateShiftPatternInput,
) {
  const { tz } = await tenantTimezone(app, tenantId);
  assertDailyDayBefore(input.workDate ?? "", tz, input.cadence);

  const emp = await app.db.query.employees.findFirst({
    where: and(
      eq(employees.id, input.employeeId),
      eq(employees.tenantId, tenantId),
    ),
  });
  if (!emp) throw httpErr(404, "Employee not found");

  const [row] = await app.db
    .insert(shiftPatterns)
    .values({
      tenantId,
      employeeId: input.employeeId,
      cadence: input.cadence,
      workDate: input.cadence === "daily" ? input.workDate! : null,
      weekdays: input.cadence === "weekly" ? (input.weekdays ?? []) : [],
      monthDays: input.cadence === "monthly" ? (input.monthDays ?? []) : [],
      startTime: input.startTime,
      endTime: input.endTime,
      effectiveFrom: input.effectiveFrom ?? null,
      effectiveUntil: input.effectiveUntil ?? null,
      createdByUserId: actor.sub,
    })
    .returning();

  await materializeShiftPatterns(app, tenantId);
  return row;
}

export async function updateShiftPattern(
  app: App,
  tenantId: string,
  id: string,
  input: UpdateShiftPatternInput,
) {
  const existing = await app.db.query.shiftPatterns.findFirst({
    where: and(eq(shiftPatterns.id, id), eq(shiftPatterns.tenantId, tenantId)),
  });
  if (!existing) throw httpErr(404, "Shift pattern not found");

  const [row] = await app.db
    .update(shiftPatterns)
    .set({
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
      ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
      ...(input.weekdays !== undefined ? { weekdays: input.weekdays } : {}),
      ...(input.monthDays !== undefined ? { monthDays: input.monthDays } : {}),
      ...(input.effectiveFrom !== undefined
        ? { effectiveFrom: input.effectiveFrom }
        : {}),
      ...(input.effectiveUntil !== undefined
        ? { effectiveUntil: input.effectiveUntil }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(shiftPatterns.id, id))
    .returning();

  await materializeShiftPatterns(app, tenantId);
  return row;
}

export async function listShiftPatterns(app: App, tenantId: string) {
  return app.db.query.shiftPatterns.findMany({
    where: eq(shiftPatterns.tenantId, tenantId),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function listShiftInstances(
  app: App,
  tenantId: string,
  query: { employeeId?: string; from?: string; to?: string },
) {
  const { tz } = await tenantTimezone(app, tenantId);
  const from = query.from ?? todayInZone(tz);
  const to = query.to ?? addDays(from, 14);
  const conditions = [
    eq(shiftInstances.tenantId, tenantId),
    gte(shiftInstances.workDate, from),
    lte(shiftInstances.workDate, to),
    ne(shiftInstances.status, "cancelled"),
  ];
  if (query.employeeId) {
    conditions.push(eq(shiftInstances.employeeId, query.employeeId));
  }
  return app.db.query.shiftInstances.findMany({
    where: and(...conditions),
    orderBy: (t, { asc }) => [asc(t.workDate), asc(t.startAt)],
  });
}

export async function cancelShiftInstance(
  app: App,
  tenantId: string,
  id: string,
) {
  const row = await app.db.query.shiftInstances.findFirst({
    where: and(eq(shiftInstances.id, id), eq(shiftInstances.tenantId, tenantId)),
  });
  if (!row) throw httpErr(404, "Shift instance not found");
  const [updated] = await app.db
    .update(shiftInstances)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(shiftInstances.id, id))
    .returning();
  return updated;
}

export async function getTodayShiftForEmployee(
  app: App,
  tenantId: string,
  employeeId: string,
) {
  const { tz, settings } = await tenantTimezone(app, tenantId);
  const today = todayInZone(tz);
  const instance = await app.db.query.shiftInstances.findFirst({
    where: and(
      eq(shiftInstances.tenantId, tenantId),
      eq(shiftInstances.employeeId, employeeId),
      eq(shiftInstances.workDate, today),
      eq(shiftInstances.status, "scheduled"),
    ),
  });
  const pendingIncident = await app.db.query.leftZoneIncidents.findFirst({
    where: and(
      eq(leftZoneIncidents.tenantId, tenantId),
      eq(leftZoneIncidents.employeeId, employeeId),
      eq(leftZoneIncidents.status, "pending"),
    ),
    orderBy: (t, { desc }) => [desc(t.detectedAt)],
  });
  const activeBreak = instance
    ? await app.db.query.breakSessions.findFirst({
        where: and(
          eq(breakSessions.tenantId, tenantId),
          eq(breakSessions.shiftInstanceId, instance.id),
          eq(breakSessions.status, "active"),
        ),
      })
    : null;
  const policy = await resolveBreakPolicy(app, tenantId, employeeId);
  return {
    instance,
    pendingLeftZoneIncident: pendingIncident ?? null,
    activeBreak: activeBreak ?? null,
    breakPolicy: policy,
    graceMinutes: settings.latenessGraceMinutes ?? DEFAULT_LATENESS_GRACE_MINUTES,
    timezone: tz,
  };
}

export async function resolveBreakPolicy(
  app: App,
  tenantId: string,
  employeeId: string,
) {
  const override = await app.db.query.breakPolicies.findFirst({
    where: and(
      eq(breakPolicies.tenantId, tenantId),
      eq(breakPolicies.employeeId, employeeId),
    ),
  });
  if (override) return override.enabled ? override : null;
  const global = await app.db.query.breakPolicies.findFirst({
    where: and(
      eq(breakPolicies.tenantId, tenantId),
      isNull(breakPolicies.employeeId),
    ),
  });
  if (!global || !global.enabled) return null;
  return global;
}

export async function upsertBreakPolicy(
  app: App,
  tenantId: string,
  input: UpsertBreakPolicyInput,
) {
  if (input.employeeId) {
    const emp = await app.db.query.employees.findFirst({
      where: and(
        eq(employees.id, input.employeeId),
        eq(employees.tenantId, tenantId),
      ),
    });
    if (!emp) throw httpErr(404, "Employee not found");
  }
  const existing = input.employeeId
    ? await app.db.query.breakPolicies.findFirst({
        where: and(
          eq(breakPolicies.tenantId, tenantId),
          eq(breakPolicies.employeeId, input.employeeId),
        ),
      })
    : await app.db.query.breakPolicies.findFirst({
        where: and(
          eq(breakPolicies.tenantId, tenantId),
          isNull(breakPolicies.employeeId),
        ),
      });

  const values = {
    tenantId,
    employeeId: input.employeeId ?? null,
    enabled: input.enabled,
    durationMinutes: input.durationMinutes,
    periodMode: input.periodMode,
    fixedStartTime:
      input.periodMode === "fixed" ? (input.fixedStartTime ?? null) : null,
    fixedEndTime:
      input.periodMode === "fixed" ? (input.fixedEndTime ?? null) : null,
    maxBreaksPerShift: input.maxBreaksPerShift,
    updatedAt: new Date(),
  };

  if (existing) {
    const [row] = await app.db
      .update(breakPolicies)
      .set(values)
      .where(eq(breakPolicies.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await app.db.insert(breakPolicies).values(values).returning();
  return row;
}

export async function listBreakPolicies(app: App, tenantId: string) {
  return app.db.query.breakPolicies.findMany({
    where: eq(breakPolicies.tenantId, tenantId),
  });
}

export async function isValidActiveBreak(
  session: {
    status: string;
    startedAt: Date | null;
    durationMinutes: number;
    plannedEndAt: Date | null;
  },
  now = new Date(),
) {
  if (session.status !== "active" || !session.startedAt) return false;
  const hardEnd = new Date(
    session.startedAt.getTime() + session.durationMinutes * 60_000,
  );
  if (session.plannedEndAt && session.plannedEndAt < hardEnd) {
    return now < session.plannedEndAt;
  }
  return now < hardEnd;
}

export async function startBreak(
  app: App,
  tenantId: string,
  employeeId: string,
) {
  const today = await getTodayShiftForEmployee(app, tenantId, employeeId);
  if (!today.instance) throw httpErr(400, "No shift scheduled today");
  const open = await app.db.query.attendanceRecords.findFirst({
    where: and(
      eq(attendanceRecords.tenantId, tenantId),
      eq(attendanceRecords.employeeId, employeeId),
      isNull(attendanceRecords.clockOutAt),
    ),
  });
  if (!open) throw httpErr(400, "Must be clocked in to start a break");
  if (today.activeBreak) throw httpErr(409, "Already on break");

  const policy = today.breakPolicy;
  if (!policy) throw httpErr(400, "No break policy configured");

  const used = await app.db.query.breakSessions.findMany({
    where: and(
      eq(breakSessions.shiftInstanceId, today.instance.id),
      or(
        eq(breakSessions.status, "ended"),
        eq(breakSessions.status, "active"),
        eq(breakSessions.status, "overstayed"),
      ),
    ),
  });
  if (used.length >= policy.maxBreaksPerShift) {
    throw httpErr(400, "Break allowance already used for this shift");
  }

  const now = new Date();
  const { tz } = await tenantTimezone(app, tenantId);
  let plannedStartAt: Date | null = null;
  let plannedEndAt: Date | null = null;
  let source: "fixed_window" | "employee_request" = "employee_request";

  if (policy.periodMode === "fixed") {
    if (!policy.fixedStartTime || !policy.fixedEndTime) {
      throw httpErr(400, "Fixed break window is misconfigured");
    }
    plannedStartAt = zonedDateTime(
      today.instance.workDate,
      policy.fixedStartTime,
      tz,
    );
    plannedEndAt = zonedDateTime(
      today.instance.workDate,
      policy.fixedEndTime,
      tz,
    );
    if (now < plannedStartAt || now > plannedEndAt) {
      throw httpErr(400, "Outside the fixed break window");
    }
    source = "fixed_window";
  }

  const [row] = await app.db
    .insert(breakSessions)
    .values({
      tenantId,
      employeeId,
      shiftInstanceId: today.instance.id,
      attendanceRecordId: open.id,
      status: "active",
      plannedStartAt,
      plannedEndAt,
      startedAt: now,
      source,
      durationMinutes: policy.durationMinutes,
    })
    .returning();
  return row;
}

export async function endBreak(
  app: App,
  tenantId: string,
  employeeId: string,
) {
  const active = await app.db.query.breakSessions.findFirst({
    where: and(
      eq(breakSessions.tenantId, tenantId),
      eq(breakSessions.employeeId, employeeId),
      eq(breakSessions.status, "active"),
    ),
  });
  if (!active) throw httpErr(400, "Not on break");
  const [row] = await app.db
    .update(breakSessions)
    .set({
      status: "ended",
      endedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(breakSessions.id, active.id))
    .returning();
  return row;
}

export async function respondOvertime(
  app: App,
  tenantId: string,
  employeeId: string,
  instanceId: string,
  stay: boolean,
) {
  const instance = await app.db.query.shiftInstances.findFirst({
    where: and(
      eq(shiftInstances.id, instanceId),
      eq(shiftInstances.tenantId, tenantId),
      eq(shiftInstances.employeeId, employeeId),
    ),
  });
  if (!instance) throw httpErr(404, "Shift not found");
  if (
    instance.overtimeStatus !== "prompted" &&
    instance.overtimeStatus !== "none"
  ) {
    throw httpErr(409, "Overtime already responded");
  }
  const [row] = await app.db
    .update(shiftInstances)
    .set({
      overtimeStatus: stay ? "approved" : "declined",
      overtimeRespondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(shiftInstances.id, instanceId))
    .returning();
  return row;
}

async function notifyTenantAdmins(
  app: App,
  tenantId: string,
  input: {
    type: "left_zone_exit" | "break_overstay" | "overtime_prompt";
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  },
) {
  const admins = await app.db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, "tenant_admin")),
  });
  for (const admin of admins) {
    await createNotification(app, {
      tenantId,
      userId: admin.id,
      type: input.type,
      title: input.title,
      body: input.body,
      category: "attendance",
      urgency: "warning",
      metadata: input.metadata ?? {},
    });
  }
}

export async function resolveLeftZoneIncident(
  app: App,
  tenantId: string,
  incidentId: string,
  actor: JwtPayload,
  resolution: LeftZoneIncidentResolution,
  note = "",
) {
  const incident = await app.db.query.leftZoneIncidents.findFirst({
    where: and(
      eq(leftZoneIncidents.id, incidentId),
      eq(leftZoneIncidents.tenantId, tenantId),
    ),
  });
  if (!incident) throw httpErr(404, "Incident not found");
  if (incident.status !== "pending") {
    throw httpErr(409, "Incident already resolved");
  }

  const status =
    resolution === "approved_emergency"
      ? ("approved_emergency" as const)
      : ("day_deduction" as const);

  const [row] = await app.db
    .update(leftZoneIncidents)
    .set({
      status,
      resolvedAt: new Date(),
      resolvedByUserId: actor.sub,
      resolutionNote: note || null,
    })
    .where(eq(leftZoneIncidents.id, incidentId))
    .returning();

  if (status === "day_deduction") {
    if (incident.shiftInstanceId) {
      await app.db
        .update(shiftInstances)
        .set({ dayDeduction: true, updatedAt: new Date() })
        .where(eq(shiftInstances.id, incident.shiftInstanceId));
    }
    const att = await app.db.query.attendanceRecords.findFirst({
      where: eq(attendanceRecords.id, incident.attendanceRecordId),
    });
    if (att && !att.anomalyFlags.includes("day_deduction")) {
      await app.db
        .update(attendanceRecords)
        .set({
          anomalyFlags: [...att.anomalyFlags, "day_deduction"],
          updatedAt: new Date(),
        })
        .where(eq(attendanceRecords.id, att.id));
    }
  }

  const emp = await app.db.query.employees.findFirst({
    where: eq(employees.id, incident.employeeId),
    columns: { userId: true },
  });
  if (emp) {
    await createNotification(app, {
      tenantId,
      userId: emp.userId,
      type: "left_zone_exit",
      title:
        status === "approved_emergency"
          ? "Emergency exit approved"
          : "Day marked for deduction",
      body:
        status === "approved_emergency"
          ? "You may clock in again from your work zone."
          : "Your work day was closed with a day deduction after leaving the work zone.",
      category: "attendance",
      metadata: { incidentId, resolution: status },
    });
  }

  return row;
}

export async function listLeftZoneIncidents(
  app: App,
  tenantId: string,
  status?: "pending" | "approved_emergency" | "day_deduction",
) {
  return app.db.query.leftZoneIncidents.findMany({
    where: status
      ? and(
          eq(leftZoneIncidents.tenantId, tenantId),
          eq(leftZoneIncidents.status, status),
        )
      : eq(leftZoneIncidents.tenantId, tenantId),
    orderBy: (t, { desc }) => [desc(t.detectedAt)],
  });
}

function leftZonePhaseFor(
  instance: { endAt: Date; overtimeStatus: string } | null,
  grace: number,
  overstay: boolean,
  now: Date,
): LeftZonePhase {
  if (overstay) return "break_overstay";
  if (!instance) return "mid_shift";
  if (instance.overtimeStatus === "approved") return "overtime";
  const end = instance.endAt.getTime();
  if (now.getTime() >= end && now.getTime() <= end + grace) return "end_grace";
  if (now.getTime() > end + grace) return "end_grace";
  return "mid_shift";
}

export type AutoClockOutResult = {
  attendanceId: string;
  incidentId: string | null;
} | null;

/**
 * Auto clock-out when outside geofence and not on a valid break.
 * Call after confirming the employee is outside (caller handles consecutive pings).
 */
export async function autoClockOutLeftZone(
  app: App,
  input: {
    tenantId: string;
    employeeId: string;
    lat: number;
    lng: number;
    overstay?: boolean;
  },
): Promise<AutoClockOutResult> {
  const { tz, settings } = await tenantTimezone(app, input.tenantId);
  if (settings.leftZoneAutoClockOut === false) return null;

  const open = await app.db.query.attendanceRecords.findFirst({
    where: and(
      eq(attendanceRecords.tenantId, input.tenantId),
      eq(attendanceRecords.employeeId, input.employeeId),
      isNull(attendanceRecords.clockOutAt),
    ),
  });
  if (!open) return null;

  const today = todayInZone(tz);
  const instance = await app.db.query.shiftInstances.findFirst({
    where: and(
      eq(shiftInstances.tenantId, input.tenantId),
      eq(shiftInstances.employeeId, input.employeeId),
      eq(shiftInstances.workDate, today),
      eq(shiftInstances.status, "scheduled"),
    ),
  });

  const activeBreak = await app.db.query.breakSessions.findFirst({
    where: and(
      eq(breakSessions.tenantId, input.tenantId),
      eq(breakSessions.employeeId, input.employeeId),
      eq(breakSessions.status, "active"),
    ),
  });
  if (activeBreak && (await isValidActiveBreak(activeBreak)) && !input.overstay) {
    return null;
  }

  const now = new Date();
  const flags = open.anomalyFlags.includes("left_zone_auto_clock_out")
    ? open.anomalyFlags
    : [...open.anomalyFlags, "left_zone_auto_clock_out"];

  await app.db
    .update(attendanceRecords)
    .set({
      clockOutAt: now,
      clockOutLat: input.lat,
      clockOutLng: input.lng,
      anomalyFlags: flags,
      updatedAt: now,
    })
    .where(eq(attendanceRecords.id, open.id));

  if (activeBreak) {
    await app.db
      .update(breakSessions)
      .set({
        status: input.overstay ? "overstayed" : "ended",
        endedAt: now,
        updatedAt: now,
      })
      .where(eq(breakSessions.id, activeBreak.id));
  }

  if (instance) {
    await app.db
      .update(shiftInstances)
      .set({
        autoClockOutReason: "left_zone",
        attendanceRecordId: open.id,
        updatedAt: now,
      })
      .where(eq(shiftInstances.id, instance.id));
  }

  await app.db
    .update(employeeLiveLocations)
    .set({ isClockedIn: false, updatedAt: now })
    .where(eq(employeeLiveLocations.employeeId, input.employeeId));

  broadcastToTenant(input.tenantId, {
    type: "location.update",
    payload: {
      employeeId: input.employeeId,
      lat: input.lat,
      lng: input.lng,
      updatedAt: now.toISOString(),
      isClockedIn: false,
    },
  });

  const phase = leftZonePhaseFor(
    instance ?? null,
    graceMs(settings),
    Boolean(input.overstay),
    now,
  );
  const resolution: LeftZoneResolution =
    settings.leftZoneResolution ?? "require_admin";

  let status: "pending" | "approved_emergency" | "day_deduction" = "pending";
  if (resolution === "auto_approve_emergency") {
    status = "approved_emergency";
  } else if (resolution === "auto_day_deduction") {
    status = "day_deduction";
  }

  const [incident] = await app.db
    .insert(leftZoneIncidents)
    .values({
      tenantId: input.tenantId,
      employeeId: input.employeeId,
      shiftInstanceId: instance?.id ?? null,
      attendanceRecordId: open.id,
      detectedAt: now,
      lat: input.lat,
      lng: input.lng,
      phase,
      status,
      resolvedAt: status === "pending" ? null : now,
      resolutionNote:
        status === "pending" ? null : `Auto-resolved: ${resolution}`,
    })
    .returning();

  if (status === "day_deduction" && instance) {
    await app.db
      .update(shiftInstances)
      .set({ dayDeduction: true, updatedAt: now })
      .where(eq(shiftInstances.id, instance.id));
    if (!flags.includes("day_deduction")) {
      await app.db
        .update(attendanceRecords)
        .set({
          anomalyFlags: [...flags, "day_deduction"],
          updatedAt: now,
        })
        .where(eq(attendanceRecords.id, open.id));
    }
  }

  const emp = await app.db.query.employees.findFirst({
    where: eq(employees.id, input.employeeId),
    with: { user: true } as never,
    columns: { userId: true },
  });
  const empUser = await app.db.query.users.findFirst({
    where: eq(users.id, emp!.userId),
    columns: { name: true, id: true },
  });

  await notifyTenantAdmins(app, input.tenantId, {
    type: "left_zone_exit",
    title: "Employee left work zone",
    body: `${empUser?.name ?? "Employee"} was auto clocked out after leaving the work zone (${phase.replace("_", " ")}).`,
    metadata: {
      incidentId: incident.id,
      employeeId: input.employeeId,
      phase,
      status,
      actions:
        status === "pending"
          ? ["approved_emergency", "day_deduction"]
          : undefined,
    },
  });

  if (empUser) {
    await createNotification(app, {
      tenantId: input.tenantId,
      userId: empUser.id,
      type: "left_zone_exit",
      title: "Auto clocked out — left work zone",
      body:
        status === "pending"
          ? "You left your work zone. Waiting for admin approval to clock in again."
          : status === "approved_emergency"
            ? "You left your work zone and were clocked out. You may clock in again."
            : "You left your work zone. This day was marked for deduction.",
      category: "attendance",
      metadata: { incidentId: incident.id, status },
    });
  }

  return { attendanceId: open.id, incidentId: incident.id };
}

/** Track consecutive outside pings in-memory per employee (process-local). */
const outsidePingCounts = new Map<string, number>();

export function resetOutsidePingCount(employeeId: string) {
  outsidePingCounts.delete(employeeId);
}

export async function handleComplianceLocationPing(
  app: App,
  input: {
    tenantId: string;
    employeeId: string;
    lat: number;
    lng: number;
  },
): Promise<{ autoClockedOut: boolean }> {
  const emp = await app.db.query.employees.findFirst({
    where: and(
      eq(employees.id, input.employeeId),
      eq(employees.tenantId, input.tenantId),
    ),
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
    resetOutsidePingCount(input.employeeId);
    return { autoClockedOut: false };
  }

  const check = isInsideGeofence(
    { lat: input.lat, lng: input.lng },
    {
      lat: emp.geofenceLat,
      lng: emp.geofenceLng,
      radiusMeters: emp.geofenceRadiusMeters,
    },
  );

  if (check.inside) {
    resetOutsidePingCount(input.employeeId);
    return { autoClockedOut: false };
  }

  // Check break overstay first
  const activeBreak = await app.db.query.breakSessions.findFirst({
    where: and(
      eq(breakSessions.tenantId, input.tenantId),
      eq(breakSessions.employeeId, input.employeeId),
      eq(breakSessions.status, "active"),
    ),
  });
  const overstay = Boolean(
    activeBreak && !(await isValidActiveBreak(activeBreak)),
  );
  if (activeBreak && !overstay) {
    resetOutsidePingCount(input.employeeId);
    return { autoClockedOut: false };
  }

  const key = input.employeeId;
  const count = (outsidePingCounts.get(key) ?? 0) + 1;
  outsidePingCounts.set(key, count);
  if (count < 2) return { autoClockedOut: false };

  const result = await autoClockOutLeftZone(app, {
    tenantId: input.tenantId,
    employeeId: input.employeeId,
    lat: input.lat,
    lng: input.lng,
    overstay,
  });
  resetOutsidePingCount(input.employeeId);
  return { autoClockedOut: Boolean(result) };
}

export async function assertCanClockIn(
  app: App,
  tenantId: string,
  employeeId: string,
): Promise<{
  instance: typeof shiftInstances.$inferSelect | null;
  skipLate: boolean;
}> {
  const { tz } = await tenantTimezone(app, tenantId);
  const today = todayInZone(tz);

  const pending = await app.db.query.leftZoneIncidents.findFirst({
    where: and(
      eq(leftZoneIncidents.tenantId, tenantId),
      eq(leftZoneIncidents.employeeId, employeeId),
      eq(leftZoneIncidents.status, "pending"),
    ),
  });
  if (pending) {
    throw httpErr(
      403,
      "Waiting for admin on left-zone exit — cannot clock in yet",
    );
  }

  const instance = await app.db.query.shiftInstances.findFirst({
    where: and(
      eq(shiftInstances.tenantId, tenantId),
      eq(shiftInstances.employeeId, employeeId),
      eq(shiftInstances.workDate, today),
      eq(shiftInstances.status, "scheduled"),
    ),
  });

  if (instance?.dayDeduction) {
    throw httpErr(403, "This work day is marked for deduction — clock-in blocked");
  }

  const emergency = await app.db.query.leftZoneIncidents.findFirst({
    where: and(
      eq(leftZoneIncidents.tenantId, tenantId),
      eq(leftZoneIncidents.employeeId, employeeId),
      eq(leftZoneIncidents.status, "approved_emergency"),
      instance
        ? eq(leftZoneIncidents.shiftInstanceId, instance.id)
        : sql`true`,
    ),
    orderBy: (t, { desc }) => [desc(t.resolvedAt)],
  });

  return {
    instance: instance ?? null,
    skipLate: Boolean(emergency && instance),
  };
}

export async function onClockInLinked(
  app: App,
  tenantId: string,
  employeeId: string,
  attendanceId: string,
  clockInAt: Date,
) {
  const { settings } = await tenantTimezone(app, tenantId);
  const gate = await assertCanClockIn(app, tenantId, employeeId).catch(
    () => null,
  );
  // Re-fetch instance without throwing (already gated in route)
  const { tz } = await tenantTimezone(app, tenantId);
  const today = todayInZone(tz);
  const instance = await app.db.query.shiftInstances.findFirst({
    where: and(
      eq(shiftInstances.tenantId, tenantId),
      eq(shiftInstances.employeeId, employeeId),
      eq(shiftInstances.workDate, today),
      eq(shiftInstances.status, "scheduled"),
    ),
  });
  if (!instance) return;

  const late =
    !gate?.skipLate &&
    clockInAt.getTime() > instance.startAt.getTime() + graceMs(settings);

  await app.db
    .update(shiftInstances)
    .set({
      attendanceRecordId: attendanceId,
      lateClockIn: late || instance.lateClockIn,
      updatedAt: new Date(),
    })
    .where(eq(shiftInstances.id, instance.id));

  if (late) {
    const att = await app.db.query.attendanceRecords.findFirst({
      where: eq(attendanceRecords.id, attendanceId),
    });
    if (att && !att.anomalyFlags.includes("late_clock_in")) {
      await app.db
        .update(attendanceRecords)
        .set({
          anomalyFlags: [...att.anomalyFlags, "late_clock_in"],
          updatedAt: new Date(),
        })
        .where(eq(attendanceRecords.id, attendanceId));
    }
  }
}

export async function onClockOutLinked(
  app: App,
  tenantId: string,
  employeeId: string,
  attendanceId: string,
  clockOutAt: Date,
) {
  const { settings, tz } = await tenantTimezone(app, tenantId);
  const today = todayInZone(tz);
  const instance = await app.db.query.shiftInstances.findFirst({
    where: and(
      eq(shiftInstances.tenantId, tenantId),
      eq(shiftInstances.employeeId, employeeId),
      eq(shiftInstances.workDate, today),
      eq(shiftInstances.status, "scheduled"),
    ),
  });

  const activeBreak = await app.db.query.breakSessions.findFirst({
    where: and(
      eq(breakSessions.tenantId, tenantId),
      eq(breakSessions.employeeId, employeeId),
      eq(breakSessions.status, "active"),
    ),
  });
  if (activeBreak) {
    await app.db
      .update(breakSessions)
      .set({ status: "ended", endedAt: clockOutAt, updatedAt: clockOutAt })
      .where(eq(breakSessions.id, activeBreak.id));
  }

  if (!instance) return;

  const lateOut =
    instance.overtimeStatus !== "approved" &&
    clockOutAt.getTime() > instance.endAt.getTime() + graceMs(settings);

  await app.db
    .update(shiftInstances)
    .set({
      attendanceRecordId: attendanceId,
      lateClockOut: lateOut || instance.lateClockOut,
      updatedAt: new Date(),
    })
    .where(eq(shiftInstances.id, instance.id));

  if (lateOut) {
    const att = await app.db.query.attendanceRecords.findFirst({
      where: eq(attendanceRecords.id, attendanceId),
    });
    if (att && !att.anomalyFlags.includes("late_clock_out")) {
      await app.db
        .update(attendanceRecords)
        .set({
          anomalyFlags: [...att.anomalyFlags, "late_clock_out"],
          updatedAt: new Date(),
        })
        .where(eq(attendanceRecords.id, attendanceId));
    }
  }
}

export async function runShiftComplianceJobs(app: App) {
  const allTenants = await app.db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
  });
  const now = new Date();

  for (const tenant of allTenants) {
    const tz = tenant.settings.timezone ?? "UTC";
    const grace = graceMs(tenant.settings);
    const today = todayInZone(tz);

    // Overtime prompts
    const due = await app.db.query.shiftInstances.findMany({
      where: and(
        eq(shiftInstances.tenantId, tenant.id),
        eq(shiftInstances.workDate, today),
        eq(shiftInstances.status, "scheduled"),
        eq(shiftInstances.overtimeStatus, "none"),
        lte(shiftInstances.endAt, now),
      ),
    });
    for (const instance of due) {
      const open = await app.db.query.attendanceRecords.findFirst({
        where: and(
          eq(attendanceRecords.tenantId, tenant.id),
          eq(attendanceRecords.employeeId, instance.employeeId),
          isNull(attendanceRecords.clockOutAt),
        ),
      });
      if (!open) continue;

      await app.db
        .update(shiftInstances)
        .set({
          overtimeStatus: "prompted",
          overtimePromptedAt: now,
          updatedAt: now,
        })
        .where(eq(shiftInstances.id, instance.id));

      const emp = await app.db.query.employees.findFirst({
        where: eq(employees.id, instance.employeeId),
        columns: { userId: true },
      });
      if (emp) {
        await createNotification(app, {
          tenantId: tenant.id,
          userId: emp.userId,
          type: "overtime_prompt",
          title: "Are you staying overtime?",
          body: "Your shift has ended. Tap Yes to stay as overtime, or No and clock out within the grace period.",
          category: "attendance",
          urgency: "warning",
          metadata: {
            shiftInstanceId: instance.id,
            actions: ["yes", "no"],
          },
        });
      }
    }

    // Late unanswered overtime
    const prompted = await app.db.query.shiftInstances.findMany({
      where: and(
        eq(shiftInstances.tenantId, tenant.id),
        eq(shiftInstances.workDate, today),
        eq(shiftInstances.overtimeStatus, "prompted"),
      ),
    });
    for (const instance of prompted) {
      if (now.getTime() <= instance.endAt.getTime() + grace) continue;
      await app.db
        .update(shiftInstances)
        .set({
          overtimeStatus: "late_unanswered",
          lateClockOut: true,
          updatedAt: now,
        })
        .where(eq(shiftInstances.id, instance.id));
    }

    // Also mark late for declined who didn't clock out
    const declined = await app.db.query.shiftInstances.findMany({
      where: and(
        eq(shiftInstances.tenantId, tenant.id),
        eq(shiftInstances.workDate, today),
        eq(shiftInstances.overtimeStatus, "declined"),
        eq(shiftInstances.lateClockOut, false),
      ),
    });
    for (const instance of declined) {
      if (now.getTime() <= instance.endAt.getTime() + grace) continue;
      const open = await app.db.query.attendanceRecords.findFirst({
        where: and(
          eq(attendanceRecords.tenantId, tenant.id),
          eq(attendanceRecords.employeeId, instance.employeeId),
          isNull(attendanceRecords.clockOutAt),
        ),
      });
      if (!open) continue;
      await app.db
        .update(shiftInstances)
        .set({ lateClockOut: true, updatedAt: now })
        .where(eq(shiftInstances.id, instance.id));
    }

    // Break overstay
    const actives = await app.db.query.breakSessions.findMany({
      where: and(
        eq(breakSessions.tenantId, tenant.id),
        eq(breakSessions.status, "active"),
      ),
    });
    for (const session of actives) {
      if (await isValidActiveBreak(session, now)) continue;
      await app.db
        .update(breakSessions)
        .set({ status: "overstayed", updatedAt: now })
        .where(eq(breakSessions.id, session.id));

      const emp = await app.db.query.employees.findFirst({
        where: eq(employees.id, session.employeeId),
        columns: {
          userId: true,
          geofenceLat: true,
          geofenceLng: true,
          geofenceRadiusMeters: true,
        },
      });
      if (emp) {
        await createNotification(app, {
          tenantId: tenant.id,
          userId: emp.userId,
          type: "break_overstay",
          title: "Break time ended",
          body: "Your break allowance ended. Return to your work zone or you may be auto clocked out.",
          category: "attendance",
        });
      }
      const live = await app.db.query.employeeLiveLocations.findFirst({
        where: eq(employeeLiveLocations.employeeId, session.employeeId),
      });
      if (
        live &&
        emp &&
        emp.geofenceLat != null &&
        emp.geofenceLng != null &&
        emp.geofenceRadiusMeters != null
      ) {
        const check = isInsideGeofence(
          { lat: live.lat, lng: live.lng },
          {
            lat: emp.geofenceLat,
            lng: emp.geofenceLng,
            radiusMeters: emp.geofenceRadiusMeters,
          },
        );
        if (!check.inside) {
          await autoClockOutLeftZone(app, {
            tenantId: tenant.id,
            employeeId: session.employeeId,
            lat: live.lat,
            lng: live.lng,
            overstay: true,
          });
        }
      }
    }
  }

  await materializeShiftPatterns(app);
}
