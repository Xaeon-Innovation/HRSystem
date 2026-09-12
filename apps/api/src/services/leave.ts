import { and, eq, gte, or, sql } from "drizzle-orm";
import { branches, employees, leaveStates, notifications, tenants, users } from "@hr/db";
import {
  LeaveStore,
  emptyLeaveSnapshot,
  hasSystemModuleRole,
  normalizeSystemModuleRoles,
  persistableLeaveState,
  type JwtPayload,
  type LeaveActor,
  type LeaveNotificationEvent,
  type LeaveNotificationSetting,
  type LeavePersistedState,
  type LeaveRequest,
  type LeaveRequestDraft,
  type LeaveSnapshot,
} from "@hr/shared";
import type { App } from "../types.js";
import { createNotification } from "./notifications.js";

function asDateOnly(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "string") return value.slice(0, 10);
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

function actorFrom(user: JwtPayload, name: string): LeaveActor {
  return {
    id: user.sub,
    name,
    role: user.role,
    employeeId: user.employeeId,
    systemModuleRoles: normalizeSystemModuleRoles(user.systemModuleRoles),
  };
}

function systemLeaveActor(): LeaveActor {
  return {
    id: "system",
    name: "System",
    role: "tenant_admin",
    employeeId: null,
    systemModuleRoles: ["leaves"],
  };
}

function isPersistedState(value: unknown): value is LeavePersistedState {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return Array.isArray(row.types) && Array.isArray(row.requests);
}

function mergePersisted(raw: unknown): LeavePersistedState {
  const empty = persistableLeaveState(emptyLeaveSnapshot());
  if (!isPersistedState(raw)) return empty;
  return {
    types: raw.types?.length ? raw.types : empty.types,
    policies: raw.policies?.length ? raw.policies : empty.policies,
    balances: raw.balances ?? [],
    transactions: raw.transactions ?? [],
    requests: raw.requests ?? [],
    notifications: raw.notifications?.length
      ? raw.notifications
      : empty.notifications,
  };
}

function leaveNotifyEnabled(
  settings: LeaveNotificationSetting[] | undefined,
  event: LeaveNotificationEvent,
  audience: "employee" | "manager" | "admin",
) {
  const row = settings?.find((s) => s.event === event);
  if (!row) return true;
  return Boolean(row[audience]);
}

async function loadDirectory(app: App, tenantId: string) {
  const empRows = await app.db
    .select({
      id: employees.id,
      name: users.name,
      email: users.email,
      jobTitle: employees.jobTitle,
      role: users.role,
      status: employees.status,
      hireDate: employees.hireDate,
      branchId: employees.branchId,
      managerId: employees.managerId,
    })
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .where(eq(employees.tenantId, tenantId));

  const branchRows = await app.db
    .select({ id: branches.id, name: branches.name })
    .from(branches)
    .where(eq(branches.tenantId, tenantId));

  return {
    employees: empRows.map((row) => ({
      ...row,
      hireDate: asDateOnly(row.hireDate),
    })),
    branches: branchRows,
  };
}

async function userName(app: App, userId: string, fallback: string) {
  const row = await app.db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { name: true },
  });
  return row?.name ?? fallback;
}

export async function loadLeaveStore(
  app: App,
  tenantId: string,
  current: LeaveActor,
) {
  let row = await app.db.query.leaveStates.findFirst({
    where: eq(leaveStates.tenantId, tenantId),
  });
  if (!row) {
    const seed = persistableLeaveState(emptyLeaveSnapshot());
    try {
      const [created] = await app.db
        .insert(leaveStates)
        .values({ tenantId, snapshot: seed, updatedAt: new Date() })
        .returning();
      row = created;
    } catch {
      row = await app.db.query.leaveStates.findFirst({
        where: eq(leaveStates.tenantId, tenantId),
      });
    }
  }

  const persisted = mergePersisted(row?.snapshot);
  const store = new LeaveStore({
    ...persisted,
    employees: [],
  });
  const directory = await loadDirectory(app, tenantId);
  store.hydrateDirectory({
    employees: directory.employees,
    branches: directory.branches,
    current,
  });
  return store;
}

export async function saveLeaveStore(
  app: App,
  tenantId: string,
  store: LeaveStore,
) {
  const snapshot = persistableLeaveState(store.snapshot());
  await app.db
    .insert(leaveStates)
    .values({ tenantId, snapshot, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: leaveStates.tenantId,
      set: { snapshot, updatedAt: new Date() },
    });
}

export function visibleSnapshot(
  store: LeaveStore,
  actor: LeaveActor,
): LeaveSnapshot {
  const snap = store.snapshot();
  if (hasSystemModuleRole(actor, "leaves")) return snap;
  const id = actor.employeeId;
  return {
    ...snap,
    requests: store.requests(undefined, actor),
    balances: snap.balances.filter((b) => b.employeeId === id),
    transactions: snap.transactions.filter((t) => t.employeeId === id),
  };
}

export async function leaveActorFor(
  app: App,
  user: JwtPayload,
): Promise<LeaveActor> {
  const name = await userName(app, user.sub, "User");
  return actorFrom(user, name);
}

/** Post monthly accruals for one tenant (job + /accrual route). */
export async function runLeaveAccrual(app: App, tenantId: string) {
  const actor = systemLeaveActor();
  const store = await loadLeaveStore(app, tenantId, actor);
  const posted = store.runMonthlyAccrual(actor);
  await saveLeaveStore(app, tenantId, store);
  return posted;
}

async function remindAlreadySentToday(
  app: App,
  tenantId: string,
  requestId: string,
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = await app.db.query.notifications.findMany({
    where: and(
      eq(notifications.tenantId, tenantId),
      eq(notifications.eventKey, "leave_request_reminder"),
      gte(notifications.createdAt, start),
    ),
    columns: { metadata: true },
    limit: 200,
  });
  return rows.some((r) => r.metadata?.requestId === requestId);
}

/**
 * Nudge managers/admins for pending leave older than 3 days.
 * Once per calendar day per request (skip if already notified today).
 */
export async function runLeaveReminders(app: App, tenantId: string) {
  const actor = systemLeaveActor();
  const store = await loadLeaveStore(app, tenantId, actor);
  const settings = store.notifications();
  const now = new Date();
  const pendingOlder = store.inboxAlerts().filter(({ request }) => {
    if (request.status !== "pending" || !request.submittedAt) return false;
    const submitted = new Date(request.submittedAt);
    const ageDays =
      (now.getTime() - submitted.getTime()) / (24 * 60 * 60 * 1000);
    // Pending > 3 days; once-per-day via remindAlreadySentToday (day gate).
    return ageDays >= 3;
  });

  let sent = 0;
  for (const { request } of pendingOlder) {
    if (await remindAlreadySentToday(app, tenantId, request.id)) continue;
    const body = `${request.employeeName}'s ${request.leaveTypeName} request (${request.startDate} – ${request.endDate}) is still pending.`;
    const metadata = { requestId: request.id, employeeId: request.employeeId };

    if (leaveNotifyEnabled(settings, "pending_reminder", "admin")) {
      await notifyTenantAdmins(app, tenantId, {
        title: "Leave approval reminder",
        body,
        eventKey: "leave_request_reminder",
        metadata,
      });
    }

    if (
      leaveNotifyEnabled(settings, "pending_reminder", "manager") &&
      request.managerId
    ) {
      const manager = await app.db.query.employees.findFirst({
        where: and(
          eq(employees.id, request.managerId),
          eq(employees.tenantId, tenantId),
        ),
        columns: { userId: true },
      });
      if (manager) {
        await createNotification(app, {
          tenantId,
          userId: manager.userId,
          type: "alert",
          title: "Leave approval reminder",
          body,
          eventKey: "leave_request_reminder",
          category: "leave",
          metadata,
        });
      }
    }
    sent += 1;
  }
  return sent;
}

export async function runLeaveJobsForAllTenants(
  app: App,
  opts: { runAccrual: boolean; runReminders: boolean },
) {
  const allTenants = await app.db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
  });
  for (const tenant of allTenants) {
    if (opts.runAccrual) {
      try {
        const posted = await runLeaveAccrual(app, tenant.id);
        if (posted) {
          app.log.info({ tenantId: tenant.id, posted }, "leave accrual posted");
        }
      } catch (err) {
        app.log.error({ err, tenantId: tenant.id }, "leave accrual failed");
      }
    }
    if (opts.runReminders) {
      try {
        const sent = await runLeaveReminders(app, tenant.id);
        if (sent) {
          app.log.info({ tenantId: tenant.id, sent }, "leave reminders sent");
        }
      } catch (err) {
        app.log.error({ err, tenantId: tenant.id }, "leave reminders failed");
      }
    }
  }
}

async function notifyTenantAdmins(
  app: App,
  tenantId: string,
  input: {
    title: string;
    body: string;
    eventKey: string;
    metadata?: Record<string, unknown>;
    exceptUserId?: string;
  },
) {
  const admins = await app.db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenantId),
        or(
          eq(users.role, "tenant_admin"),
          sql`${users.systemModuleRoles} @> ${JSON.stringify(["leaves"])}::jsonb`,
        ),
      ),
    );
  for (const admin of admins) {
    if (input.exceptUserId && admin.id === input.exceptUserId) continue;
    await createNotification(app, {
      tenantId,
      userId: admin.id,
      type: "alert",
      title: input.title,
      body: input.body,
      eventKey: input.eventKey,
      category: "leave",
      metadata: input.metadata,
    });
  }
}

async function notifyEmployeeUser(
  app: App,
  tenantId: string,
  employeeId: string,
  input: {
    title: string;
    body: string;
    eventKey: string;
    metadata?: Record<string, unknown>;
  },
) {
  const emp = await app.db.query.employees.findFirst({
    where: and(eq(employees.id, employeeId), eq(employees.tenantId, tenantId)),
    columns: { userId: true },
  });
  if (!emp) return;
  await createNotification(app, {
    tenantId,
    userId: emp.userId,
    type: "alert",
    title: input.title,
    body: input.body,
    eventKey: input.eventKey,
    category: "leave",
    metadata: input.metadata,
  });
}

export async function notifyLeaveSubmitted(
  app: App,
  tenantId: string,
  request: LeaveRequest,
  actor: LeaveActor,
) {
  if (request.status !== "pending") return;
  const store = await loadLeaveStore(app, tenantId, actor);
  const settings = store.notifications();
  const body = `${request.employeeName} requested ${request.requestedDays} day(s) of ${request.leaveTypeName} (${request.startDate} – ${request.endDate}).`;
  const metadata = { requestId: request.id, employeeId: request.employeeId };

  const notified = new Set<string>();
  if (leaveNotifyEnabled(settings, "request_submitted", "admin")) {
    const admins = await app.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.tenantId, tenantId),
          or(
            eq(users.role, "tenant_admin"),
            sql`${users.systemModuleRoles} @> ${JSON.stringify(["leaves"])}::jsonb`,
          ),
        ),
      );
    for (const admin of admins) {
      if (admin.id === actor.id) continue;
      await createNotification(app, {
        tenantId,
        userId: admin.id,
        type: "alert",
        title: "New leave request",
        body,
        eventKey: "leave_request_submitted",
        category: "leave",
        metadata,
      });
      notified.add(admin.id);
    }
  }

  if (!leaveNotifyEnabled(settings, "request_submitted", "manager")) return;

  const requester = await app.db.query.employees.findFirst({
    where: and(
      eq(employees.id, request.employeeId),
      eq(employees.tenantId, tenantId),
    ),
    columns: { managerId: true },
  });
  if (!requester?.managerId) return;
  const manager = await app.db.query.employees.findFirst({
    where: and(
      eq(employees.id, requester.managerId),
      eq(employees.tenantId, tenantId),
    ),
    columns: { userId: true },
  });
  if (!manager || manager.userId === actor.id || notified.has(manager.userId)) {
    return;
  }
  await createNotification(app, {
    tenantId,
    userId: manager.userId,
    type: "alert",
    title: "Team leave request",
    body,
    eventKey: "leave_request_submitted",
    category: "leave",
    metadata,
  });
}

export async function notifyLeaveDecision(
  app: App,
  tenantId: string,
  request: LeaveRequest,
) {
  const actor = systemLeaveActor();
  const store = await loadLeaveStore(app, tenantId, actor);
  const settings = store.notifications();

  if (request.status === "approved") {
    if (!leaveNotifyEnabled(settings, "request_approved", "employee")) return;
    await notifyEmployeeUser(app, tenantId, request.employeeId, {
      title: "Leave approved",
      body: `Your ${request.leaveTypeName} from ${request.startDate} to ${request.endDate} was approved.`,
      eventKey: "leave_approved",
      metadata: { requestId: request.id },
    });
    return;
  }
  if (request.status === "rejected") {
    if (!leaveNotifyEnabled(settings, "request_rejected", "employee")) return;
    await notifyEmployeeUser(app, tenantId, request.employeeId, {
      title: "Leave rejected",
      body: request.rejectionReason
        ? `Your ${request.leaveTypeName} request was declined: ${request.rejectionReason}`
        : `Your ${request.leaveTypeName} request was declined.`,
      eventKey: "leave_rejected",
      metadata: { requestId: request.id },
    });
  }
}

export function draftForActor(
  actor: LeaveActor,
  body: LeaveRequestDraft,
): LeaveRequestDraft {
  if (!hasSystemModuleRole(actor, "leaves")) {
    if (!actor.employeeId) {
      throw new Error("No employee profile");
    }
    return { ...body, employeeId: actor.employeeId };
  }
  if (!body.employeeId) {
    throw new Error("Select an employee for this request.");
  }
  return body;
}
