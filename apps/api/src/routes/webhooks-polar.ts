import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import {
  paymentEvents,
  plans,
  tenantSubscriptions,
  tenants,
} from "@hr/db";
import {
  validateEvent,
  WebhookVerificationError,
} from "@polar-sh/sdk/webhooks";
import { writeAudit } from "../lib/audit.js";
import { getPolarConfig, mapPolarStatus } from "../lib/polar.js";
import type { App } from "../types.js";

type PolarSubscriptionLike = {
  id: string;
  status: string;
  seats?: number | null;
  cancelAtPeriodEnd?: boolean;
  currentPeriodStart?: Date | string | null;
  currentPeriodEnd?: Date | string | null;
  customerId?: string | null;
  metadata?: Record<string, unknown> | null;
  customer?: {
    id?: string;
    externalId?: string | null;
    metadata?: Record<string, unknown> | null;
  } | null;
  productId?: string | null;
  product?: { id?: string; metadata?: Record<string, unknown> | null } | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function metaString(
  meta: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const v = meta?.[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

async function handleSubscriptionEvent(
  app: App,
  eventType: string,
  sub: PolarSubscriptionLike,
  paymentEventId?: string,
) {
  const metadata = asRecord(sub.metadata) ?? {};
  const customerMeta = asRecord(sub.customer?.metadata) ?? {};
  const tenantId =
    metaString(metadata, "tenantId") ??
    metaString(customerMeta, "tenantId") ??
    (typeof sub.customer?.externalId === "string"
      ? sub.customer.externalId
      : null);
  const planIdFromMeta = metaString(metadata, "planId");

  let matched = await app.db.query.tenantSubscriptions.findFirst({
    where: eq(tenantSubscriptions.polarSubscriptionId, sub.id),
  });

  if (!matched && tenantId) {
    matched = await app.db.query.tenantSubscriptions.findFirst({
      where: eq(tenantSubscriptions.tenantId, tenantId),
    });
  }

  let planId = planIdFromMeta;
  if (!planId && sub.productId) {
    const plan = await app.db.query.plans.findFirst({
      where: eq(plans.polarProductId, sub.productId),
    });
    planId = plan?.id ?? null;
  }
  if (!planId && sub.product?.id) {
    const plan = await app.db.query.plans.findFirst({
      where: eq(plans.polarProductId, sub.product.id),
    });
    planId = plan?.id ?? null;
  }

  const nextStatus =
    eventType === "subscription.revoked"
      ? ("canceled" as const)
      : mapPolarStatus(sub.status);

  const purchasedSeats =
    typeof sub.seats === "number" && sub.seats > 0 ? sub.seats : null;
  const polarCustomerId = sub.customerId ?? sub.customer?.id ?? null;
  const periodStart = toDate(sub.currentPeriodStart);
  const periodEnd = toDate(sub.currentPeriodEnd);

  if (!matched) {
    if (!tenantId || !planId) {
      app.log.warn(
        { eventType, polarSubId: sub.id, tenantId, planId },
        "Polar subscription webhook: cannot match tenant/plan",
      );
      return;
    }
    const now = new Date();
    const [created] = await app.db
      .insert(tenantSubscriptions)
      .values({
        tenantId,
        planId,
        status: nextStatus,
        polarSubscriptionId: sub.id,
        polarCustomerId,
        purchasedSeats,
        cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
        currentPeriodStart: periodStart ?? now,
        currentPeriodEnd: periodEnd,
      })
      .returning();
    matched = created;
  } else {
    await app.db
      .update(tenantSubscriptions)
      .set({
        status: nextStatus,
        polarSubscriptionId: sub.id,
        polarCustomerId: polarCustomerId ?? matched.polarCustomerId,
        purchasedSeats: purchasedSeats ?? matched.purchasedSeats,
        planId: planId ?? matched.planId,
        cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
        currentPeriodStart: periodStart ?? matched.currentPeriodStart,
        currentPeriodEnd: periodEnd ?? matched.currentPeriodEnd,
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.id, matched.id));
  }

  if (paymentEventId) {
    await app.db
      .update(paymentEvents)
      .set({
        tenantId: matched.tenantId,
        subscriptionId: matched.id,
      })
      .where(eq(paymentEvents.id, paymentEventId));
  }

  if (eventType === "subscription.revoked") {
    await app.db
      .update(tenants)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(tenants.id, matched.tenantId));
  }

  if (nextStatus === "active") {
    await app.db
      .update(tenants)
      .set({ status: "active", updatedAt: new Date() })
      .where(
        and(eq(tenants.id, matched.tenantId), eq(tenants.status, "suspended")),
      );
  }

  await writeAudit(app, {
    actor: null,
    action: `polar.${eventType}`,
    tenantId: matched.tenantId,
    resourceType: "subscription",
    resourceId: matched.id,
    metadata: {
      polarSubscriptionId: sub.id,
      status: nextStatus,
      seats: purchasedSeats,
    },
  });
}

export const polarWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (req, body, done) => {
      try {
        const raw = body as Buffer;
        (req as { rawBody?: Buffer }).rawBody = raw;
        const json = JSON.parse(raw.toString("utf8")) as unknown;
        done(null, json);
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  app.post("/", async (request, reply) => {
    const config = getPolarConfig();
    if (!config?.webhookSecret) {
      return reply.code(503).send({ error: "Polar webhooks not configured" });
    }

    const rawBody = (request as { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      return reply.code(400).send({ error: "Missing raw body" });
    }

    let event: { type: string; data: unknown };
    try {
      const headers: Record<string, string> = {};
      for (const [k, v] of Object.entries(request.headers)) {
        if (typeof v === "string") headers[k] = v;
        else if (Array.isArray(v) && typeof v[0] === "string") headers[k] = v[0];
      }
      event = validateEvent(rawBody, headers, config.webhookSecret) as {
        type: string;
        data: unknown;
      };
    } catch (err) {
      if (err instanceof WebhookVerificationError) {
        return reply.code(401).send({ error: "Invalid webhook signature" });
      }
      throw err;
    }

    const externalId =
      (asRecord(event.data)?.id as string | undefined) ??
      `${event.type}:${Date.now()}`;

    const inserted = await app.db
      .insert(paymentEvents)
      .values({
        provider: "polar",
        externalId,
        triggerType: event.type,
        payload: (asRecord(event.data) ?? { type: event.type }) as Record<
          string,
          unknown
        >,
      })
      .onConflictDoNothing({
        target: [
          paymentEvents.provider,
          paymentEvents.externalId,
          paymentEvents.triggerType,
        ],
      })
      .returning();

    if (inserted.length === 0) {
      return { ok: true, duplicate: true };
    }

    const subscriptionEvents = new Set([
      "subscription.created",
      "subscription.updated",
      "subscription.active",
      "subscription.canceled",
      "subscription.uncanceled",
      "subscription.revoked",
      "subscription.past_due",
      "subscription.cycled",
      "subscription.paused",
      "subscription.resumed",
    ]);

    if (subscriptionEvents.has(event.type)) {
      await handleSubscriptionEvent(
        app as App,
        event.type,
        event.data as PolarSubscriptionLike,
        inserted[0]?.id,
      );
    } else if (
      (event.type === "order.paid" || event.type === "checkout.updated") &&
      inserted[0]?.id
    ) {
      const data = asRecord(event.data) ?? {};
      const metadata = asRecord(data.metadata) ?? {};
      const customerMeta = asRecord(
        asRecord(data.customer)?.metadata,
      ) ?? {};
      const tenantId =
        metaString(metadata, "tenantId") ??
        metaString(customerMeta, "tenantId") ??
        (typeof data.externalCustomerId === "string"
          ? data.externalCustomerId
          : null);
      if (tenantId) {
        await app.db
          .update(paymentEvents)
          .set({ tenantId })
          .where(eq(paymentEvents.id, inserted[0].id));
      }
    }

    return { ok: true };
  });
};
