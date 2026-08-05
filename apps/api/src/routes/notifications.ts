import type { FastifyPluginAsync } from "fastify";
import { and, desc, eq } from "drizzle-orm";
import { notifications, pushSubscriptions, users } from "@hr/db";
import { announcementSchema } from "@hr/shared";
import type { JwtPayload } from "@hr/shared";
import {
  requireRoles,
  requireTenantScope,
  tenantIdOf,
} from "../types.js";
import { createNotification } from "../services/notifications.js";

export const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());

  app.get("/", async (request) => {
    const tenantId = tenantIdOf(request);
    const user = request.user as JwtPayload;
    const rows = await app.db.query.notifications.findMany({
      where: and(
        eq(notifications.tenantId, tenantId),
        eq(notifications.userId, user.sub),
      ),
      orderBy: [desc(notifications.createdAt)],
      limit: 100,
    });
    return { notifications: rows };
  });

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
        });
      }
      return reply.code(201).send({ sent: recipients.length });
    },
  );
};
