import type { FastifyInstance } from "fastify";
import { notifications } from "@hr/db";
import {
  categoryFromNotificationType,
  eventKeyFromNotificationType,
  getCatalogAlert,
  urgencyFromNotificationType,
  type AlertCategory,
  type AlertUrgency,
  type NotificationType,
} from "@hr/shared";

export async function createNotification(
  app: FastifyInstance,
  input: {
    tenantId: string;
    userId: string;
    type?: NotificationType;
    title: string;
    body: string;
    category?: AlertCategory | null;
    urgency?: AlertUrgency | null;
    eventKey?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const catalog = input.eventKey ? getCatalogAlert(input.eventKey) : undefined;
  const type = input.type ?? "alert";
  const category =
    input.category ??
    catalog?.category ??
    categoryFromNotificationType(type);
  const urgency =
    input.urgency ?? catalog?.defaultUrgency ?? urgencyFromNotificationType(type);
  const eventKey =
    input.eventKey ?? eventKeyFromNotificationType(type);

  // Web-push / FCM wiring: mark delivered locally; real FCM keys optional via env
  const deliveryStatus = process.env.FCM_SERVER_KEY ? "queued" : "delivered_local";
  const [row] = await app.db
    .insert(notifications)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      type,
      title: input.title,
      body: input.body,
      deliveryStatus,
      category,
      urgency,
      eventKey,
      metadata: input.metadata ?? {},
    })
    .returning();
  return row;
}
