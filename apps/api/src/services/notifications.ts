import type { FastifyInstance } from "fastify";
import { notifications } from "@hr/db";
import type { NotificationType } from "@hr/shared";

export async function createNotification(
  app: FastifyInstance,
  input: {
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
  },
) {
  // Web-push / FCM wiring: mark delivered locally; real FCM keys optional via env
  const deliveryStatus = process.env.FCM_SERVER_KEY ? "queued" : "delivered_local";
  const [row] = await app.db
    .insert(notifications)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      deliveryStatus,
    })
    .returning();
  return row;
}
