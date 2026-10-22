import type { FastifyInstance } from "fastify";
import { and, asc, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import {
  employeeJobRoles,
  employees,
  notifications,
  taskActivity,
  taskAssignees,
  taskAttachments,
  taskDeliverableRequirements,
  taskDeliverableSubmissions,
  tasks,
  tenants,
  users,
  type TaskAssigneeTargets,
} from "@hr/db";
import type {
  CreateTaskInput,
  JwtPayload,
  TaskAttachmentInput,
  TaskDeliverableSubmitInput,
  TaskReviewInput,
  TaskStatus,
  UpdateTaskInput,
} from "@hr/shared";
import { createNotification } from "./notifications.js";

type App = FastifyInstance;

const OPEN_STATUSES: TaskStatus[] = [
  "open",
  "in_progress",
  "submitted",
  "changes_requested",
];

/** Bump optimistic-concurrency version on every task mutation. */
const bumpVersion = { version: sql`${tasks.version} + 1` };

function isAdmin(actor: JwtPayload) {
  return (
    actor.role === "tenant_admin" ||
    (actor.role === "super_admin" && Boolean(actor.tenantId))
  );
}

export async function resolveAssigneeEmployeeIds(
  app: App,
  tenantId: string,
  input: {
    employeeIds: string[];
    jobRoleIds: string[];
    branchIds: string[];
  },
): Promise<string[]> {
  const ids = new Set<string>();

  if (input.employeeIds.length) {
    const rows = await app.db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.status, "active"),
          inArray(employees.id, input.employeeIds),
        ),
      );
    for (const row of rows) ids.add(row.id);
  }

  if (input.jobRoleIds.length) {
    const rows = await app.db
      .select({ employeeId: employeeJobRoles.employeeId })
      .from(employeeJobRoles)
      .innerJoin(employees, eq(employees.id, employeeJobRoles.employeeId))
      .where(
        and(
          eq(employeeJobRoles.tenantId, tenantId),
          eq(employees.tenantId, tenantId),
          eq(employees.status, "active"),
          inArray(employeeJobRoles.jobRoleId, input.jobRoleIds),
        ),
      );
    for (const row of rows) ids.add(row.employeeId);
  }

  if (input.branchIds.length) {
    const rows = await app.db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.tenantId, tenantId),
          eq(employees.status, "active"),
          inArray(employees.branchId, input.branchIds),
        ),
      );
    for (const row of rows) ids.add(row.id);
  }

  return [...ids];
}

async function employeeUserMap(app: App, tenantId: string, employeeIds: string[]) {
  if (!employeeIds.length) return new Map<string, { userId: string; name: string }>();
  const rows = await app.db
    .select({
      employeeId: employees.id,
      userId: employees.userId,
      name: users.name,
    })
    .from(employees)
    .innerJoin(users, eq(users.id, employees.userId))
    .where(
      and(eq(employees.tenantId, tenantId), inArray(employees.id, employeeIds)),
    );
  return new Map(rows.map((r) => [r.employeeId, { userId: r.userId, name: r.name }]));
}

async function writeActivity(
  app: App,
  input: {
    tenantId: string;
    taskId: string;
    kind: (typeof taskActivity.$inferInsert)["kind"];
    actor: JwtPayload;
    message: string;
    metadata?: Record<string, unknown>;
  },
) {
  await app.db.insert(taskActivity).values({
    tenantId: input.tenantId,
    taskId: input.taskId,
    kind: input.kind,
    actorUserId: input.actor.sub,
    actorEmployeeId: input.actor.employeeId ?? null,
    message: input.message,
    metadata: input.metadata ?? {},
  });
}

function attachmentValues(
  tenantId: string,
  taskId: string,
  uploadedByUserId: string,
  att: TaskAttachmentInput,
) {
  if (att.kind === "link") {
    return {
      tenantId,
      taskId,
      kind: "link" as const,
      name: att.name,
      url: att.url,
      mime: null,
      size: null,
      dataUrl: null,
      uploadedByUserId,
    };
  }
  return {
    tenantId,
    taskId,
    kind: "file" as const,
    name: att.name,
    mime: att.mime,
    size: att.size,
    url: null,
    dataUrl: att.dataUrl,
    uploadedByUserId,
  };
}

async function insertTaskBundle(
  app: App,
  opts: {
    tenantId: string;
    actor: JwtPayload;
    input: CreateTaskInput;
    assigneeEmployeeIds: string[];
    batchId: string | null;
    assignmentMode: "shared" | "individual";
    targets: TaskAssigneeTargets;
  },
) {
  const dueAt = opts.input.dueAt ? new Date(opts.input.dueAt) : null;
  const [task] = await app.db
    .insert(tasks)
    .values({
      tenantId: opts.tenantId,
      title: opts.input.title,
      description: opts.input.description ?? "",
      priority: opts.input.priority ?? "medium",
      status: "open",
      dueAt,
      requiresReview: opts.input.requiresReview ?? false,
      assignmentMode: opts.assignmentMode,
      batchId: opts.batchId,
      tags: opts.input.tags ?? [],
      assigneeTargets: opts.targets,
      createdByUserId: opts.actor.sub,
    })
    .returning();

  if (opts.assigneeEmployeeIds.length) {
    await app.db.insert(taskAssignees).values(
      opts.assigneeEmployeeIds.map((employeeId) => ({
        tenantId: opts.tenantId,
        taskId: task.id,
        employeeId,
      })),
    );
  }

  if (opts.input.attachments?.length) {
    await app.db.insert(taskAttachments).values(
      opts.input.attachments.map((att) =>
        attachmentValues(opts.tenantId, task.id, opts.actor.sub, att),
      ),
    );
  }

  if (opts.input.deliverableRequirements?.length) {
    await app.db.insert(taskDeliverableRequirements).values(
      opts.input.deliverableRequirements.map((req) => ({
        tenantId: opts.tenantId,
        taskId: task.id,
        type: req.type,
        label: req.label ?? null,
      })),
    );
  }

  await writeActivity(app, {
    tenantId: opts.tenantId,
    taskId: task.id,
    kind: "created",
    actor: opts.actor,
    message: `Created task “${task.title}”`,
  });

  return task;
}

async function notifyAssignees(
  app: App,
  tenantId: string,
  task: { id: string; title: string; dueAt: Date | null },
  employeeIds: string[],
) {
  const map = await employeeUserMap(app, tenantId, employeeIds);
  const due = task.dueAt
    ? ` Due ${task.dueAt.toISOString().slice(0, 10)}.`
    : "";
  for (const empId of employeeIds) {
    const user = map.get(empId);
    if (!user) continue;
    await createNotification(app, {
      tenantId,
      userId: user.userId,
      type: "alert",
      title: "New task assigned",
      body: `You were assigned “${task.title}”.${due}`,
      eventKey: "task_assigned",
      category: "employee",
      metadata: { taskId: task.id, employeeId: empId },
    });
  }
}

export async function createTasks(
  app: App,
  tenantId: string,
  actor: JwtPayload,
  input: CreateTaskInput,
) {
  const targets: TaskAssigneeTargets = {
    employeeIds: input.employeeIds ?? [],
    jobRoleIds: input.jobRoleIds ?? [],
    branchIds: input.branchIds ?? [],
  };
  const resolved = await resolveAssigneeEmployeeIds(app, tenantId, targets);
  if (!resolved.length) {
    throw Object.assign(new Error("No active employees matched the assignees"), {
      statusCode: 400,
    });
  }

  const mode = input.assignmentMode ?? "shared";

  if (mode === "shared") {
    const task = await insertTaskBundle(app, {
      tenantId,
      actor,
      input,
      assigneeEmployeeIds: resolved,
      batchId: null,
      assignmentMode: "shared",
      targets,
    });
    await notifyAssignees(app, tenantId, task, resolved);
    return { tasks: [await getTaskDetail(app, tenantId, task.id, actor)] };
  }

  const batchId = crypto.randomUUID();
  const created = [];
  for (const employeeId of resolved) {
    const task = await insertTaskBundle(app, {
      tenantId,
      actor,
      input,
      assigneeEmployeeIds: [employeeId],
      batchId,
      assignmentMode: "individual",
      targets,
    });
    await notifyAssignees(app, tenantId, task, [employeeId]);
    created.push(task);
  }
  const details = [];
  for (const task of created) {
    details.push(await getTaskDetail(app, tenantId, task.id, actor));
  }
  return { tasks: details, batchId };
}

async function loadAssigneesForTasks(app: App, tenantId: string, taskIds: string[]) {
  if (!taskIds.length) return new Map<string, Array<{ employeeId: string; name: string; userId: string }>>();
  const rows = await app.db
    .select({
      taskId: taskAssignees.taskId,
      employeeId: taskAssignees.employeeId,
      userId: employees.userId,
      name: users.name,
    })
    .from(taskAssignees)
    .innerJoin(employees, eq(employees.id, taskAssignees.employeeId))
    .innerJoin(users, eq(users.id, employees.userId))
    .where(
      and(
        eq(taskAssignees.tenantId, tenantId),
        inArray(taskAssignees.taskId, taskIds),
      ),
    );
  const map = new Map<
    string,
    Array<{ employeeId: string; name: string; userId: string }>
  >();
  for (const row of rows) {
    const list = map.get(row.taskId) ?? [];
    list.push({
      employeeId: row.employeeId,
      name: row.name,
      userId: row.userId,
    });
    map.set(row.taskId, list);
  }
  return map;
}

export async function listTasks(
  app: App,
  tenantId: string,
  actor: JwtPayload,
  query: {
    status?: TaskStatus;
    priority?: string;
    batchId?: string;
    assigneeEmployeeId?: string;
    tag?: string;
    q?: string;
  },
) {
  const admin = isAdmin(actor);
  const conditions = [eq(tasks.tenantId, tenantId)];
  if (query.status) conditions.push(eq(tasks.status, query.status));
  if (query.priority) {
    conditions.push(
      eq(tasks.priority, query.priority as (typeof tasks.$inferSelect)["priority"]),
    );
  }
  if (query.batchId) conditions.push(eq(tasks.batchId, query.batchId));

  let rows = await app.db.query.tasks.findMany({
    where: and(...conditions),
    orderBy: [desc(tasks.createdAt)],
    limit: 500,
  });

  if (!admin) {
    if (!actor.employeeId) return { tasks: [] };
    const mine = await app.db
      .select({ taskId: taskAssignees.taskId })
      .from(taskAssignees)
      .where(
        and(
          eq(taskAssignees.tenantId, tenantId),
          eq(taskAssignees.employeeId, actor.employeeId),
        ),
      );
    const allowed = new Set(mine.map((m) => m.taskId));
    rows = rows.filter((r) => allowed.has(r.id));
  } else if (query.assigneeEmployeeId) {
    const matched = await app.db
      .select({ taskId: taskAssignees.taskId })
      .from(taskAssignees)
      .where(
        and(
          eq(taskAssignees.tenantId, tenantId),
          eq(taskAssignees.employeeId, query.assigneeEmployeeId),
        ),
      );
    const allowed = new Set(matched.map((m) => m.taskId));
    rows = rows.filter((r) => allowed.has(r.id));
  }

  if (query.tag) {
    const tag = query.tag.toLowerCase();
    rows = rows.filter((r) =>
      (r.tags ?? []).some((t) => t.toLowerCase() === tag),
    );
  }
  if (query.q) {
    const q = query.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }

  const assignees = await loadAssigneesForTasks(
    app,
    tenantId,
    rows.map((r) => r.id),
  );

  return {
    tasks: rows.map((row) => ({
      ...serializeTask(row),
      assignees: assignees.get(row.id) ?? [],
    })),
  };
}

function serializeTask(row: typeof tasks.$inferSelect) {
  return {
    id: row.id,
    tenantId: row.tenantId,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueAt: row.dueAt?.toISOString() ?? null,
    requiresReview: row.requiresReview,
    assignmentMode: row.assignmentMode,
    batchId: row.batchId,
    tags: row.tags ?? [],
    assigneeTargets: row.assigneeTargets,
    createdByUserId: row.createdByUserId,
    reviewNote: row.reviewNote,
    completedAt: row.completedAt?.toISOString() ?? null,
    completedByUserId: row.completedByUserId,
    version: row.version,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function assertCanViewTask(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
) {
  const task = await app.db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)),
  });
  if (!task) return null;
  if (isAdmin(actor)) return task;
  if (!actor.employeeId) return null;
  const assignee = await app.db.query.taskAssignees.findFirst({
    where: and(
      eq(taskAssignees.taskId, taskId),
      eq(taskAssignees.tenantId, tenantId),
      eq(taskAssignees.employeeId, actor.employeeId),
    ),
  });
  return assignee ? task : null;
}

export async function getTaskDetail(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
) {
  const task = await assertCanViewTask(app, tenantId, taskId, actor);
  if (!task) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }

  const [assigneeMap, attachments, requirements, submissions, activity] =
    await Promise.all([
      loadAssigneesForTasks(app, tenantId, [taskId]),
      app.db.query.taskAttachments.findMany({
        where: and(
          eq(taskAttachments.tenantId, tenantId),
          eq(taskAttachments.taskId, taskId),
        ),
        orderBy: [asc(taskAttachments.createdAt)],
      }),
      app.db.query.taskDeliverableRequirements.findMany({
        where: and(
          eq(taskDeliverableRequirements.tenantId, tenantId),
          eq(taskDeliverableRequirements.taskId, taskId),
        ),
        orderBy: [asc(taskDeliverableRequirements.createdAt)],
      }),
      app.db.query.taskDeliverableSubmissions.findMany({
        where: and(
          eq(taskDeliverableSubmissions.tenantId, tenantId),
          eq(taskDeliverableSubmissions.taskId, taskId),
        ),
        orderBy: [asc(taskDeliverableSubmissions.createdAt)],
      }),
      app.db.query.taskActivity.findMany({
        where: and(
          eq(taskActivity.tenantId, tenantId),
          eq(taskActivity.taskId, taskId),
        ),
        orderBy: [desc(taskActivity.createdAt)],
        limit: 100,
      }),
    ]);

  const actorIds = [
    ...new Set([
      ...activity.map((a) => a.actorUserId),
      ...submissions.map((s) => s.uploadedByUserId),
      ...attachments.map((a) => a.uploadedByUserId),
    ]),
  ];
  const nameRows = actorIds.length
    ? await app.db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, actorIds))
    : [];
  const names = new Map(nameRows.map((r) => [r.id, r.name]));

  const empIds = [
    ...new Set(submissions.map((s) => s.employeeId).filter(Boolean)),
  ];
  const empNames = empIds.length
    ? await employeeUserMap(app, tenantId, empIds)
    : new Map();

  return {
    ...serializeTask(task),
    assignees: assigneeMap.get(taskId) ?? [],
    attachments: attachments.map((a) => ({
      id: a.id,
      kind: a.kind,
      name: a.name,
      mime: a.mime,
      size: a.size,
      url: a.url,
      dataUrl: a.dataUrl,
      uploadedByUserId: a.uploadedByUserId,
      uploadedByName: names.get(a.uploadedByUserId) ?? null,
      createdAt: a.createdAt.toISOString(),
    })),
    deliverableRequirements: requirements.map((r) => ({
      id: r.id,
      type: r.type,
      label: r.label,
      createdAt: r.createdAt.toISOString(),
    })),
    deliverableSubmissions: submissions.map((s) => ({
      id: s.id,
      requirementId: s.requirementId,
      employeeId: s.employeeId,
      employeeName: empNames.get(s.employeeId)?.name ?? null,
      uploadedByUserId: s.uploadedByUserId,
      uploadedByName: names.get(s.uploadedByUserId) ?? null,
      kind: s.kind,
      name: s.name,
      mime: s.mime,
      size: s.size,
      url: s.url,
      dataUrl: s.dataUrl,
      createdAt: s.createdAt.toISOString(),
    })),
    activity: activity.map((a) => ({
      id: a.id,
      kind: a.kind,
      actorUserId: a.actorUserId,
      actorEmployeeId: a.actorEmployeeId,
      actorName: names.get(a.actorUserId) ?? null,
      message: a.message,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
    })),
  };
}

export async function updateTaskMeta(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
  input: UpdateTaskInput,
) {
  const existing = await app.db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)),
  });
  if (!existing) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }
  const [updated] = await app.db
    .update(tasks)
    .set({
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueAt !== undefined
        ? { dueAt: input.dueAt ? new Date(input.dueAt) : null }
        : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...bumpVersion,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)))
    .returning();
  return getTaskDetail(app, tenantId, updated.id, actor);
}

async function assertAssignee(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
) {
  if (!actor.employeeId) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
  const row = await app.db.query.taskAssignees.findFirst({
    where: and(
      eq(taskAssignees.tenantId, tenantId),
      eq(taskAssignees.taskId, taskId),
      eq(taskAssignees.employeeId, actor.employeeId),
    ),
  });
  if (!row) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
  return row;
}

async function requirementsSatisfied(
  app: App,
  tenantId: string,
  taskId: string,
) {
  const requirements = await app.db.query.taskDeliverableRequirements.findMany({
    where: and(
      eq(taskDeliverableRequirements.tenantId, tenantId),
      eq(taskDeliverableRequirements.taskId, taskId),
    ),
  });
  if (!requirements.length) return true;
  const submissions = await app.db.query.taskDeliverableSubmissions.findMany({
    where: and(
      eq(taskDeliverableSubmissions.tenantId, tenantId),
      eq(taskDeliverableSubmissions.taskId, taskId),
    ),
    columns: { requirementId: true },
  });
  const covered = new Set(submissions.map((s) => s.requirementId));
  return requirements.every((r) => covered.has(r.id));
}

export async function addTaskAttachment(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
  attachment: TaskAttachmentInput,
) {
  const task = await assertCanViewTask(app, tenantId, taskId, actor);
  if (!task) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }
  if (!isAdmin(actor)) {
    await assertAssignee(app, tenantId, taskId, actor);
  }
  if (task.status === "completed" || task.status === "cancelled") {
    throw Object.assign(new Error("Task is closed"), { statusCode: 400 });
  }
  const existing = await app.db.query.taskAttachments.findMany({
    where: and(
      eq(taskAttachments.tenantId, tenantId),
      eq(taskAttachments.taskId, taskId),
    ),
  });
  if (existing.length >= 10) {
    throw Object.assign(new Error("Too many attachments"), { statusCode: 400 });
  }
  await app.db
    .insert(taskAttachments)
    .values(attachmentValues(tenantId, taskId, actor.sub, attachment));
  await writeActivity(app, {
    tenantId,
    taskId,
    kind: "attached",
    actor,
    message: `Added ${attachment.kind} “${attachment.name}”`,
  });
  return getTaskDetail(app, tenantId, taskId, actor);
}

export async function submitDeliverable(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
  input: TaskDeliverableSubmitInput,
) {
  const task = await assertCanViewTask(app, tenantId, taskId, actor);
  if (!task) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }
  await assertAssignee(app, tenantId, taskId, actor);
  if (task.status === "completed" || task.status === "cancelled") {
    throw Object.assign(new Error("Task is closed"), { statusCode: 400 });
  }
  const req = await app.db.query.taskDeliverableRequirements.findFirst({
    where: and(
      eq(taskDeliverableRequirements.id, input.requirementId),
      eq(taskDeliverableRequirements.taskId, taskId),
      eq(taskDeliverableRequirements.tenantId, tenantId),
    ),
  });
  if (!req) {
    throw Object.assign(new Error("Requirement not found"), { statusCode: 404 });
  }
  const att = attachmentValues(tenantId, taskId, actor.sub, input.attachment);
  await app.db.insert(taskDeliverableSubmissions).values({
    tenantId,
    taskId,
    requirementId: input.requirementId,
    employeeId: actor.employeeId!,
    uploadedByUserId: actor.sub,
    kind: att.kind,
    name: att.name,
    mime: att.mime,
    size: att.size,
    url: att.url,
    dataUrl: att.dataUrl,
  });
  await writeActivity(app, {
    tenantId,
    taskId,
    kind: "deliverable_submitted",
    actor,
    message: `Submitted deliverable for ${req.type}${req.label ? ` (${req.label})` : ""}`,
    metadata: { requirementId: req.id, type: req.type },
  });
  return getTaskDetail(app, tenantId, taskId, actor);
}

export async function startTask(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
) {
  const task = await assertCanViewTask(app, tenantId, taskId, actor);
  if (!task) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }
  await assertAssignee(app, tenantId, taskId, actor);
  if (task.status !== "open" && task.status !== "changes_requested") {
    throw Object.assign(new Error("Cannot start in current status"), {
      statusCode: 400,
    });
  }
  await app.db
    .update(tasks)
    .set({ status: "in_progress", ...bumpVersion, updatedAt: new Date() })
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)));
  await writeActivity(app, {
    tenantId,
    taskId,
    kind: "started",
    actor,
    message: "Started working on the task",
  });
  return getTaskDetail(app, tenantId, taskId, actor);
}

export async function completeTask(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
) {
  const task = await assertCanViewTask(app, tenantId, taskId, actor);
  if (!task) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }
  await assertAssignee(app, tenantId, taskId, actor);
  if (task.requiresReview) {
    throw Object.assign(
      new Error("This task requires review — submit instead"),
      { statusCode: 400 },
    );
  }
  if (
    task.status === "completed" ||
    task.status === "cancelled" ||
    task.status === "submitted"
  ) {
    throw Object.assign(new Error("Cannot complete in current status"), {
      statusCode: 400,
    });
  }
  if (!(await requirementsSatisfied(app, tenantId, taskId))) {
    throw Object.assign(
      new Error("Upload all required deliverables before completing"),
      { statusCode: 400 },
    );
  }
  await app.db
    .update(tasks)
    .set({
      status: "completed",
      completedAt: new Date(),
      completedByUserId: actor.sub,
      ...bumpVersion,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)));
  await writeActivity(app, {
    tenantId,
    taskId,
    kind: "completed",
    actor,
    message: "Marked the task complete",
  });
  await createNotification(app, {
    tenantId,
    userId: task.createdByUserId,
    type: "alert",
    title: "Task completed",
    body: `“${task.title}” was marked complete.`,
    eventKey: "task_reviewed",
    category: "employee",
    metadata: { taskId },
  });
  return getTaskDetail(app, tenantId, taskId, actor);
}

export async function submitTaskForReview(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
) {
  const task = await assertCanViewTask(app, tenantId, taskId, actor);
  if (!task) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }
  await assertAssignee(app, tenantId, taskId, actor);
  if (!task.requiresReview) {
    throw Object.assign(
      new Error("This task does not require review — mark complete instead"),
      { statusCode: 400 },
    );
  }
  if (
    task.status === "completed" ||
    task.status === "cancelled" ||
    task.status === "submitted"
  ) {
    throw Object.assign(new Error("Cannot submit in current status"), {
      statusCode: 400,
    });
  }
  if (!(await requirementsSatisfied(app, tenantId, taskId))) {
    throw Object.assign(
      new Error("Upload all required deliverables before submitting"),
      { statusCode: 400 },
    );
  }
  await app.db
    .update(tasks)
    .set({
      status: "submitted",
      reviewNote: null,
      ...bumpVersion,
      updatedAt: new Date(),
    })
    .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)));
  await writeActivity(app, {
    tenantId,
    taskId,
    kind: "submitted",
    actor,
    message: "Submitted the task for review",
  });
  await createNotification(app, {
    tenantId,
    userId: task.createdByUserId,
    type: "alert",
    title: "Task submitted for review",
    body: `“${task.title}” is ready for your review.`,
    eventKey: "task_submitted",
    category: "employee",
    urgency: "info",
    metadata: { taskId },
  });
  return getTaskDetail(app, tenantId, taskId, actor);
}

export async function reviewTask(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
  input: TaskReviewInput,
) {
  const task = await app.db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)),
  });
  if (!task) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }
  if (task.status !== "submitted") {
    throw Object.assign(new Error("Task is not awaiting review"), {
      statusCode: 400,
    });
  }

  if (input.decision === "approve") {
    await app.db
      .update(tasks)
      .set({
        status: "completed",
        completedAt: new Date(),
        completedByUserId: actor.sub,
        reviewNote: input.note || null,
        ...bumpVersion,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)));
    await writeActivity(app, {
      tenantId,
      taskId,
      kind: "reviewed",
      actor,
      message: input.note
        ? `Approved the task: ${input.note}`
        : "Approved the task",
    });
  } else {
    await app.db
      .update(tasks)
      .set({
        status: "changes_requested",
        reviewNote: input.note || null,
        ...bumpVersion,
        updatedAt: new Date(),
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)));
    await writeActivity(app, {
      tenantId,
      taskId,
      kind: "send_back",
      actor,
      message: input.note
        ? `Sent back for changes: ${input.note}`
        : "Sent back for changes",
    });
  }

  const assignees = await loadAssigneesForTasks(app, tenantId, [taskId]);
  const title =
    input.decision === "approve" ? "Task approved" : "Task needs changes";
  const body =
    input.decision === "approve"
      ? `“${task.title}” was approved.`
      : `“${task.title}” was sent back.${input.note ? ` ${input.note}` : ""}`;
  for (const a of assignees.get(taskId) ?? []) {
    await createNotification(app, {
      tenantId,
      userId: a.userId,
      type: "alert",
      title,
      body,
      eventKey: "task_reviewed",
      category: "employee",
      metadata: { taskId, decision: input.decision },
    });
  }

  return getTaskDetail(app, tenantId, taskId, actor);
}

export async function cancelTask(
  app: App,
  tenantId: string,
  taskId: string,
  actor: JwtPayload,
  cancelBatch: boolean,
) {
  const task = await app.db.query.tasks.findFirst({
    where: and(eq(tasks.id, taskId), eq(tasks.tenantId, tenantId)),
  });
  if (!task) {
    throw Object.assign(new Error("Not found"), { statusCode: 404 });
  }

  const ids =
    cancelBatch && task.batchId
      ? (
          await app.db
            .select({ id: tasks.id })
            .from(tasks)
            .where(
              and(eq(tasks.tenantId, tenantId), eq(tasks.batchId, task.batchId)),
            )
        ).map((r) => r.id)
      : [taskId];

  await app.db
    .update(tasks)
    .set({ status: "cancelled", ...bumpVersion, updatedAt: new Date() })
    .where(and(eq(tasks.tenantId, tenantId), inArray(tasks.id, ids)));

  for (const id of ids) {
    await writeActivity(app, {
      tenantId,
      taskId: id,
      kind: "cancelled",
      actor,
      message: cancelBatch ? "Cancelled (batch)" : "Cancelled the task",
    });
  }

  return {
    cancelledIds: ids,
    task: await getTaskDetail(app, tenantId, taskId, actor).catch(() => null),
  };
}

export async function getBatchSummary(
  app: App,
  tenantId: string,
  batchId: string,
  actor: JwtPayload,
) {
  if (!isAdmin(actor)) {
    throw Object.assign(new Error("Forbidden"), { statusCode: 403 });
  }
  const { tasks: rows } = await listTasks(app, tenantId, actor, { batchId });
  const done = rows.filter((t) => t.status === "completed").length;
  return {
    batchId,
    total: rows.length,
    completed: done,
    tasks: rows,
  };
}

async function taskDueReminderSentToday(
  app: App,
  tenantId: string,
  taskId: string,
) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const rows = await app.db.query.notifications.findMany({
    where: and(
      eq(notifications.tenantId, tenantId),
      eq(notifications.eventKey, "task_due_soon"),
      gte(notifications.createdAt, start),
    ),
    columns: { metadata: true },
    limit: 500,
  });
  return rows.some((r) => r.metadata?.taskId === taskId);
}

export async function runTaskDueSoonReminders(app: App, tenantId: string) {
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const open = await app.db.query.tasks.findMany({
    where: and(
      eq(tasks.tenantId, tenantId),
      inArray(tasks.status, OPEN_STATUSES),
      isNotNull(tasks.dueAt),
    ),
  });

  const dueSoon = open.filter(
    (t) =>
      t.dueAt &&
      t.dueAt.getTime() > now.getTime() &&
      t.dueAt.getTime() <= in24h.getTime(),
  );

  let sent = 0;
  for (const task of dueSoon) {
    if (await taskDueReminderSentToday(app, tenantId, task.id)) continue;
    const assignees = await loadAssigneesForTasks(app, tenantId, [task.id]);
    const dueLabel = task.dueAt!.toISOString().slice(0, 10);
    for (const a of assignees.get(task.id) ?? []) {
      await createNotification(app, {
        tenantId,
        userId: a.userId,
        type: "alert",
        title: "Task due soon",
        body: `“${task.title}” is due on ${dueLabel}.`,
        eventKey: "task_due_soon",
        category: "employee",
        urgency: "warning",
        metadata: { taskId: task.id },
      });
      sent += 1;
    }
  }
  return sent;
}

export async function runTaskJobsForAllTenants(app: App) {
  const all = await app.db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
    columns: { id: true },
  });
  let total = 0;
  for (const tenant of all) {
    try {
      total += await runTaskDueSoonReminders(app, tenant.id);
    } catch (err) {
      app.log.error({ err, tenantId: tenant.id }, "task due reminders failed");
    }
  }
  return total;
}
