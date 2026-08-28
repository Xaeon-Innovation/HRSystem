import type { FastifyPluginAsync } from "fastify";
import { and, count, desc, eq } from "drizzle-orm";
import { alertRules, notifications, pushSubscriptions, users } from "@hr/db";
import {
  ALERT_CATALOG,
  CUSTOM_ALERT_EXAMPLES,
  announcementSchema,
  createCustomAlertRuleSchema,
  notificationListQuerySchema,
  updateAlertRuleSchema,
} from "@hr/shared";
import type { JwtPayload } from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  requireRoles,
  requireTenantScope,
  tenantIdOf,
} from "../types.js";
import { createNotification } from "../services/notifications.js";
import {
  customRuleValues,
  ensureCatalogRules,
} from "../services/alert-rules.js";

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

  app.get("/", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const parsed = notificationListQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { unread, category, urgency } = parsed.data;
    const rows = await app.db.query.notifications.findMany({
      where: and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, user.sub),
        unread ? eq(notifications.read, false) : undefined,
        category ? eq(notifications.category, category) : undefined,
        urgency ? eq(notifications.urgency, urgency) : undefined,
      ),
      orderBy: [desc(notifications.createdAt)],
      limit: 100,
    });
    return { notifications: rows };
  });

  app.get("/unread-count", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const [row] = await app.db
      .select({ n: count() })
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, user.sub),
          eq(notifications.read, false),
        ),
      );
    return { unread: Number(row?.n ?? 0) };
  });

  app.get(
    "/catalog",
    { preHandler: requireRoles("tenant_admin") },
    async () => {
      return { catalog: ALERT_CATALOG, examples: CUSTOM_ALERT_EXAMPLES };
    },
  );

  app.get(
    "/rules",
    { preHandler: requireRoles("tenant_admin") },
    async (request) => {
      const tenantId = tenantIdOf(request);
      const rules = await ensureCatalogRules(app, tenantId);
      return { rules };
    },
  );

  app.post(
    "/rules",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = createCustomAlertRuleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const eventKey = `custom_${crypto.randomUUID()}`;
      const [rule] = await app.db
        .insert(alertRules)
        .values(customRuleValues(tenantId, parsed.data, eventKey))
        .returning();

      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "alert_rule.create",
        tenantId,
        resourceType: "alert_rule",
        resourceId: rule.id,
        metadata: { name: rule.name, eventKey: rule.eventKey },
        request,
      });

      return reply.code(201).send({ rule });
    },
  );

  app.patch(
    "/rules/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const parsed = updateAlertRuleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const existing = await app.db.query.alertRules.findFirst({
        where: and(eq(alertRules.id, id), eq(alertRules.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      if (existing.kind === "catalog") {
        const blocked = [
          "source",
          "condition",
          "metric",
          "threshold",
          "durationValue",
          "durationUnit",
          "scope",
          "scopeId",
          "titleTemplate",
          "bodyTemplate",
        ] as const;
        for (const key of blocked) {
          if (parsed.data[key] !== undefined) {
            return reply
              .code(400)
              .send({ error: "Catalog alerts cannot change metric conditions" });
          }
        }
      }
      const [updated] = await app.db
        .update(alertRules)
        .set({ ...parsed.data, updatedAt: new Date() })
        .where(
          and(eq(alertRules.id, id), eq(alertRules.tenantId, tenantId)),
        )
        .returning();

      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "alert_rule.update",
        tenantId,
        resourceType: "alert_rule",
        resourceId: id,
        metadata: parsed.data,
        request,
      });

      return { rule: updated };
    },
  );

  app.delete(
    "/rules/:id",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const { id } = request.params as { id: string };
      const existing = await app.db.query.alertRules.findFirst({
        where: and(eq(alertRules.id, id), eq(alertRules.tenantId, tenantId)),
      });
      if (!existing) return reply.code(404).send({ error: "Not found" });
      if (existing.kind !== "custom") {
        return reply.code(400).send({ error: "Catalog alerts cannot be deleted" });
      }
      await app.db
        .delete(alertRules)
        .where(
          and(eq(alertRules.id, id), eq(alertRules.tenantId, tenantId)),
        );

      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "alert_rule.delete",
        tenantId,
        resourceType: "alert_rule",
        resourceId: id,
        metadata: { name: existing.name },
        request,
      });

      return { ok: true };
    },
  );

  app.post("/:id/read", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const { id } = request.params as { id: string };
    const [updated] = await app.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.tenantId, tenantId),
          eq(notifications.userId, user.sub),
        ),
      )
      .returning();
    if (!updated) return reply.code(404).send({ error: "Not found" });
    return { notification: updated };
  });

  app.post("/read-all", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
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
    return { ok: true };
  });

  app.post("/push-subscribe", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const body = request.body as {
      endpoint?: string;
      keys?: { p256dh: string; auth: string };
    };
    if (!body.endpoint || !body.keys) {
      return reply.code(400).send({ error: "endpoint and keys required" });
    }
    await app.db
      .insert(pushSubscriptions)
      .values({
        tenantId,
        userId: user.sub,
        endpoint: body.endpoint,
        keys: body.keys,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: { keys: body.keys, userId: user.sub, tenantId },
      });
    return { ok: true };
  });

  app.post(
    "/announce",
    { preHandler: requireRoles("tenant_admin") },
    async (request, reply) => {
      const tenantId = tenantIdOf(request);
      const parsed = announcementSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const recipients = await app.db.query.users.findMany({
        where: and(
          eq(users.tenantId, tenantId),
          parsed.data.roleFilter
            ? eq(users.role, parsed.data.roleFilter)
            : undefined,
        ),
      });
      for (const r of recipients) {
        await createNotification(app, {
          tenantId,
          userId: r.id,
          type: "announcement",
          title: parsed.data.title,
          body: parsed.data.body,
          category: "system",
          urgency: "info",
          eventKey: "announcement",
        });
      }

      const actor = request.user as JwtPayload;
      await writeAudit(app, {
        actor,
        action: "announcement.create",
        tenantId,
        resourceType: "notification",
        resourceId: tenantId,
        metadata: {
          title: parsed.data.title,
          sent: recipients.length,
          roleFilter: parsed.data.roleFilter ?? null,
        },
        request,
      });

      return reply.code(201).send({ sent: recipients.length });
    },
  );
};
