import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { notifications, users } from "@hr/db";
import {
  categoryFromNotificationType,
  eventKeyFromNotificationType,
  getCatalogAlert,
  urgencyFromNotificationType,
  type AlertCategory,
  type AlertUrgency,
  type NotificationType,
} from "@hr/shared";
import { sendEmail } from "./mail.js";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function localOrQueuedStatus() {
  // FCM_SERVER_KEY marks push as queued when email is not configured / unavailable.
  return process.env.FCM_SERVER_KEY ? "queued" : "delivered_local";
}

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

  const [row] = await app.db
    .insert(notifications)
    .values({
      tenantId: input.tenantId,
      userId: input.userId,
      type,
      title: input.title,
      body: input.body,
      deliveryStatus: "pending",
      category,
      urgency,
      eventKey,
      metadata: input.metadata ?? {},
    })
    .returning();

  let deliveryStatus = localOrQueuedStatus();
  try {
    const user = await app.db.query.users.findFirst({
      where: eq(users.id, input.userId),
      columns: { email: true },
    });
    if (user?.email) {
      const result = await sendEmail({
        to: user.email,
        subject: input.title,
        text: input.body,
        html: `<p>${escapeHtml(input.body).replace(/\n/g, "<br/>")}</p>`,
      });
      if (result.ok) {
        deliveryStatus = "email_sent";
      } else if (result.reason === "not_configured") {
        deliveryStatus = localOrQueuedStatus();
      } else {
        deliveryStatus = "email_failed";
      }
    }
  } catch (err) {
    app.log.error(err, "notification email delivery failed");
    deliveryStatus = "email_failed";
  }

  const [updated] = await app.db
    .update(notifications)
    .set({ deliveryStatus })
    .where(eq(notifications.id, row.id))
    .returning();

  return updated ?? { ...row, deliveryStatus };
}
