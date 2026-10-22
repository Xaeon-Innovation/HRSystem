import { and, desc, eq, gte, inArray, lte } from "drizzle-orm";
import {
  attendanceRecords,
  clientEvents,
  notifications,
  shiftInstances,
  tasks,
  taskAssignees,
} from "@hr/db";
import type {
  JwtPayload,
  MobileLocationsBatch,
  MobileOutboxEvent,
  MobilePushResult,
  MobileSyncPullResponse,
} from "@hr/shared";
import { clockIn, clockOut } from "./attendance.js";
import {
  broadcastLocationUpdate,
  insertLocationPing,
  upsertLiveLocationClockedIn,
} from "./location.js";
import { endBreak, startBreak } from "./shifts.js";
import type { App } from "../types.js";

const OFFLINE_MAX_AGE_MS = 72 * 60 * 60 * 1000;

function serverTime(): string {
  return new Date().toISOString();
}

function tooOld(event: MobileOutboxEvent): boolean {
  if (!event.capturedOffline) return false;
  const occurred = Date.parse(event.occurredAt);
  if (!Number.isFinite(occurred)) return true;
  return Date.now() - occurred > OFFLINE_MAX_AGE_MS;
}

async function storeResult(
  app: App,
  input: {
    id: string;
    tenantId: string;
    userId: string;
    deviceId?: string | null;
    type: string;
    result: MobilePushResult;
  },
) {
  await app.db.insert(clientEvents).values({
    id: input.id,
    tenantId: input.tenantId,
    userId: input.userId,
    deviceId: input.deviceId ?? null,
    type: input.type,
    status: input.result.status,
    resultJson: input.result as unknown as Record<string, unknown>,
  });
}

async function processEvent(
  app: App,
  user: JwtPayload,
  tenantId: string,
  event: MobileOutboxEvent,
): Promise<MobilePushResult> {
  const nowIso = serverTime();

  if (tooOld(event)) {
    return {
      id: event.id,
      status: "rejected",
      reason: "too_old",
      serverTime: nowIso,
    };
  }

  const loc = event.location
    ? { lat: event.location.lat, lng: event.location.lng }
    : null;

  if (event.type === "clock.in") {
    if (!loc) {
      return {
        id: event.id,
        status: "rejected",
        reason: "location_required",
        serverTime: nowIso,
      };
    }
    const result = await clockIn(app, {
      tenantId,
      user,
      event: {
        lat: loc.lat,
        lng: loc.lng,
        clientEventId: event.id,
      },
    });
    if (!result.ok) {
      const reason =
        typeof result.body.error === "string"
          ? result.body.error
          : "clock_in_failed";
      const status =
        result.status === 403 ? "rejected" : ("rejected" as const);
      return {
        id: event.id,
        status,
        reason:
          reason === "Outside allowed work zone" ? "outside_zone" : reason,
        serverTime: nowIso,
      };
    }
    return {
      id: event.id,
      status: result.deduped ? "duplicate" : "applied",
      serverRecord: result.attendance,
      serverTime: nowIso,
    };
  }

  if (event.type === "clock.out") {
    if (!loc) {
      return {
        id: event.id,
        status: "rejected",
        reason: "location_required",
        serverTime: nowIso,
      };
    }
    const result = await clockOut(app, {
      tenantId,
      user,
      event: {
        lat: loc.lat,
        lng: loc.lng,
        clientEventId: event.id,
      },
    });
    if (!result.ok) {
      const reason =
        typeof result.body.error === "string"
          ? result.body.error
          : "clock_out_failed";
      return {
        id: event.id,
        status: "rejected",
        reason:
          reason === "Outside allowed work zone" ? "outside_zone" : reason,
        serverTime: nowIso,
      };
    }
    return {
      id: event.id,
      status: result.deduped ? "duplicate" : "applied",
      serverRecord: result.attendance,
      serverTime: nowIso,
    };
  }

  if (event.type === "break.start") {
    if (!user.employeeId) {
      return {
        id: event.id,
        status: "rejected",
        reason: "no_employee",
        serverTime: nowIso,
      };
    }
    try {
      const brk = await startBreak(app, tenantId, user.employeeId);
      return {
        id: event.id,
        status: "applied",
        serverRecord: brk,
        serverTime: nowIso,
      };
    } catch (err) {
      return {
        id: event.id,
        status: "rejected",
        reason: err instanceof Error ? err.message : "break_start_failed",
        serverTime: nowIso,
      };
    }
  }

  if (event.type === "break.end") {
    if (!user.employeeId) {
      return {
        id: event.id,
        status: "rejected",
        reason: "no_employee",
        serverTime: nowIso,
      };
    }
    try {
      const brk = await endBreak(app, tenantId, user.employeeId);
      return {
        id: event.id,
        status: "applied",
        serverRecord: brk,
        serverTime: nowIso,
      };
    } catch (err) {
      return {
        id: event.id,
        status: "rejected",
        reason: err instanceof Error ? err.message : "break_end_failed",
        serverTime: nowIso,
      };
    }
  }

  if (event.type === "overtime.stay" || event.type === "overtime.decline") {
    // Payload-less OT: resolve against today's open instance via shifts service
    // callers that know instance id should use web routes; here we reject with guidance.
    return {
      id: event.id,
      status: "rejected",
      reason: "use_shift_instance_overtime",
      serverTime: nowIso,
    };
  }

  if (event.type === "notification.read") {
    await app.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, event.payload.notificationId),
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, user.sub),
        ),
      );
    return { id: event.id, status: "applied", serverTime: nowIso };
  }

  if (event.type === "notification.readAll") {
    await app.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, user.sub),
          eq(notifications.read, false),
        ),
      );
    return { id: event.id, status: "applied", serverTime: nowIso };
  }

  // Leave/task/zone events: accepted into client_events as rejected stub until M2e/M8 wire-up,
  // except we keep the door open for applied handlers above.
  return {
    id: event.id,
    status: "rejected",
    reason: `unsupported_event:${event.type}`,
    serverTime: nowIso,
  };
}

export async function syncPush(
  app: App,
  input: {
    tenantId: string;
    user: JwtPayload;
    deviceId?: string | null;
    events: MobileOutboxEvent[];
  },
): Promise<{ results: MobilePushResult[]; serverTime: string }> {
  const results: MobilePushResult[] = [];
  const nowIso = serverTime();

  for (const event of input.events) {
    const prior = await app.db.query.clientEvents.findFirst({
      where: eq(clientEvents.id, event.id),
    });
    if (prior) {
      const stored = prior.resultJson as unknown as MobilePushResult;
      results.push({
        ...stored,
        id: event.id,
        status: "duplicate",
        serverTime: nowIso,
      });
      continue;
    }

    const result = await processEvent(app, input.user, input.tenantId, event);
    await storeResult(app, {
      id: event.id,
      tenantId: input.tenantId,
      userId: input.user.sub,
      deviceId: input.deviceId,
      type: event.type,
      result,
    });
    results.push(result);
  }

  return { results, serverTime: nowIso };
}

function parseCursor(cursor: string | undefined): Date | null {
  if (!cursor) return null;
  const ms = Date.parse(cursor);
  return Number.isFinite(ms) ? new Date(ms) : null;
}

export async function syncPull(
  app: App,
  input: {
    tenantId: string;
    user: JwtPayload;
    cursor?: string;
  },
): Promise<MobileSyncPullResponse> {
  const since = parseCursor(input.cursor);
  const now = new Date();
  const employeeId = input.user.employeeId;

  const dayMs = 24 * 60 * 60 * 1000;
  const shiftFrom = new Date(now.getTime() - 7 * dayMs);
  const shiftTo = new Date(now.getTime() + 14 * dayMs);
  const clockFrom = new Date(now.getTime() - 30 * dayMs);
  const notifFrom = new Date(now.getTime() - 60 * dayMs);
  const taskClosedFrom = new Date(now.getTime() - 30 * dayMs);

  const shiftRows = employeeId
    ? await app.db.query.shiftInstances.findMany({
        where: and(
          eq(shiftInstances.tenantId, input.tenantId),
          eq(shiftInstances.employeeId, employeeId),
          gte(shiftInstances.startAt, shiftFrom),
          lte(shiftInstances.startAt, shiftTo),
          since ? gte(shiftInstances.updatedAt, since) : undefined,
        ),
        orderBy: [desc(shiftInstances.startAt)],
        limit: 200,
      })
    : [];

  const clockRows = employeeId
    ? await app.db.query.attendanceRecords.findMany({
        where: and(
          eq(attendanceRecords.tenantId, input.tenantId),
          eq(attendanceRecords.employeeId, employeeId),
          gte(attendanceRecords.clockInAt, clockFrom),
          since ? gte(attendanceRecords.updatedAt, since) : undefined,
        ),
        orderBy: [desc(attendanceRecords.clockInAt)],
        limit: 200,
      })
    : [];

  const assigneeRows = employeeId
    ? await app.db.query.taskAssignees.findMany({
        where: and(
          eq(taskAssignees.tenantId, input.tenantId),
          eq(taskAssignees.employeeId, employeeId),
        ),
        columns: { taskId: true },
      })
    : [];
  const taskIds = assigneeRows.map((r) => r.taskId);
  const taskRows =
    taskIds.length > 0
      ? await app.db.query.tasks.findMany({
          where: and(
            eq(tasks.tenantId, input.tenantId),
            inArray(tasks.id, taskIds),
            since ? gte(tasks.updatedAt, since) : undefined,
          ),
          limit: 200,
        })
      : [];

  const filteredTasks = since
    ? taskRows
    : taskRows.filter(
        (t) =>
          t.status === "open" ||
          t.status === "in_progress" ||
          t.status === "submitted" ||
          t.status === "changes_requested" ||
          (t.updatedAt && t.updatedAt >= taskClosedFrom),
      );

  const notifRows = await app.db.query.notifications.findMany({
    where: and(
      eq(notifications.tenantId, input.tenantId),
      eq(notifications.userId, input.user.sub),
      gte(notifications.createdAt, notifFrom),
      since ? gte(notifications.createdAt, since) : undefined,
    ),
    orderBy: [desc(notifications.createdAt)],
    limit: 200,
  });

  const cursor = now.toISOString();

  return {
    changes: {
      shiftInstances: {
        upserts: shiftRows.map((r) => ({
          id: r.id,
          updatedAt: r.updatedAt.toISOString(),
          version: 1,
          employeeId: r.employeeId,
          workDate: r.workDate,
          startAt: r.startAt.toISOString(),
          endAt: r.endAt.toISOString(),
          status: r.status,
          lateClockIn: r.lateClockIn,
          overtimeStatus: r.overtimeStatus,
        })),
        deletes: [],
      },
      clockSessions: {
        upserts: clockRows.map((r) => ({
          id: r.id,
          updatedAt: r.updatedAt.toISOString(),
          version: 1,
          employeeId: r.employeeId,
          clockInAt: r.clockInAt.toISOString(),
          clockOutAt: r.clockOutAt?.toISOString() ?? null,
          anomalyFlags: r.anomalyFlags ?? [],
        })),
        deletes: [],
      },
      tasks: {
        upserts: filteredTasks.map((r) => ({
          id: r.id,
          updatedAt: r.updatedAt.toISOString(),
          version: r.version,
          title: r.title,
          status: r.status,
          priority: r.priority,
          dueAt: r.dueAt?.toISOString() ?? null,
        })),
        deletes: [],
      },
      notifications: {
        upserts: notifRows.map((r) => ({
          id: r.id,
          updatedAt: r.createdAt.toISOString(),
          type: r.type,
          title: r.title,
          body: r.body,
          read: r.read,
          category: r.category ?? null,
        })),
        deletes: [],
      },
    },
    cursor,
    serverTime: cursor,
  };
}

export async function locationsBatch(
  app: App,
  input: {
    tenantId: string;
    user: JwtPayload;
    body: MobileLocationsBatch;
  },
): Promise<{ accepted: number; serverTime: string }> {
  if (!input.user.employeeId) {
    throw Object.assign(new Error("No employee profile"), { statusCode: 400 });
  }

  let accepted = 0;
  let newest: { lat: number; lng: number; at: Date } | null = null;

  for (const point of input.body.points) {
    const at = new Date(point.at);
    await insertLocationPing(app, {
      tenantId: input.tenantId,
      employeeId: input.user.employeeId,
      lat: point.lat,
      lng: point.lng,
      recordedAt: at,
      clientPingId: point.clientPingId ?? null,
    });
    await upsertLiveLocationClockedIn(app, {
      tenantId: input.tenantId,
      employeeId: input.user.employeeId,
      lat: point.lat,
      lng: point.lng,
      recordedAt: at,
      clientPingId: point.clientPingId ?? null,
    });
    accepted += 1;
    if (!newest || at > newest.at) {
      newest = { lat: point.lat, lng: point.lng, at };
    }
  }

  if (newest && input.user.role === "employee") {
    broadcastLocationUpdate(input.tenantId, {
      employeeId: input.user.employeeId,
      lat: newest.lat,
      lng: newest.lng,
      updatedAt: newest.at.toISOString(),
      isClockedIn: true,
    });
  }

  return { accepted, serverTime: serverTime() };
}
