import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { paymentEvents, tenantSubscriptions, tenants } from "@hr/db";
import { writeAudit } from "../lib/audit.js";
import {
  getPaymobConfig,
  verifySubscriptionHmac,
  verifyTransactionHmac,
} from "../lib/paymob.js";

type PaymobWebhookBody = {
  hmac?: string;
  trigger_type?: string;
  type?: string;
  subscription_data?: { id?: string | number; [k: string]: unknown };
  obj?: Record<string, unknown>;
  [k: string]: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

export const paymobWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", async (request, reply) => {
    const config = getPaymobConfig();
    if (!config) {
      return reply.code(503).send({ error: "Paymob not configured" });
    }

    const body = (request.body ?? {}) as PaymobWebhookBody;
    const triggerType =
      body.trigger_type ??
      (typeof body.type === "string" ? body.type : undefined);

    // Subscription lifecycle events
    if (triggerType && body.subscription_data?.id != null) {
      const subId = String(body.subscription_data.id);
      const provided =
        body.hmac ??
        (request.query as { hmac?: string }).hmac ??
        "";
      if (
        !provided ||
        !verifySubscriptionHmac(config.hmacSecret, triggerType, subId, provided)
      ) {
        return reply.code(401).send({ error: "Invalid HMAC" });
      }

      const externalId = subId;
      const inserted = await app.db
        .insert(paymentEvents)
        .values({
          provider: "paymob",
          externalId,
          triggerType,
          payload: body as Record<string, unknown>,
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

      const sub = await app.db.query.tenantSubscriptions.findFirst({
        where: eq(tenantSubscriptions.paymobSubscriptionId, subId),
      });

      // Also match by special_reference / extras when first charge assigns id
      let matched = sub;
      if (!matched) {
        const extras = asRecord(body.subscription_data?.extras);
        const ref =
          (extras?.tenant_subscription_ref as string | undefined) ??
          (body.subscription_data?.special_reference as string | undefined);
        const tenantMatch = ref?.match(/^tenant:([0-9a-f-]{36})/i);
        if (tenantMatch) {
          matched = await app.db.query.tenantSubscriptions.findFirst({
            where: eq(tenantSubscriptions.tenantId, tenantMatch[1]),
          });
        }
      }

      if (matched) {
        const now = new Date();
        let nextStatus = matched.status;
        if (triggerType === "charge") nextStatus = "active";
        if (triggerType === "cancel") nextStatus = "canceled";
        if (triggerType === "failure") nextStatus = "past_due";
        if (triggerType === "retry") nextStatus = "past_due";

        const periodEnd =
          triggerType === "charge"
            ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
            : matched.currentPeriodEnd;

        const [updated] = await app.db
          .update(tenantSubscriptions)
          .set({
            status: nextStatus,
            paymobSubscriptionId: subId,
            currentPeriodStart:
              triggerType === "charge" ? now : matched.currentPeriodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd:
              triggerType === "cancel" ? true : matched.cancelAtPeriodEnd,
            updatedAt: now,
          })
          .where(eq(tenantSubscriptions.id, matched.id))
          .returning();

        await app.db
          .update(paymentEvents)
          .set({
            tenantId: updated.tenantId,
            subscriptionId: updated.id,
          })
          .where(eq(paymentEvents.id, inserted[0].id));

        if (triggerType === "failure") {
          const recentFailures = await app.db.query.paymentEvents.findMany({
            where: eq(paymentEvents.subscriptionId, updated.id),
          });
          const failures = recentFailures.filter(
            (e) => e.triggerType === "failure",
          ).length;
          if (failures >= 3) {
            await app.db
              .update(tenants)
              .set({ status: "suspended", updatedAt: now })
              .where(eq(tenants.id, updated.tenantId));
            await writeAudit(app, {
              action: "tenant.suspend",
              tenantId: updated.tenantId,
              resourceType: "tenant",
              resourceId: updated.tenantId,
              metadata: { reason: "payment_failures", failures },
              request,
            });
          }
        }

        if (triggerType === "cancel") {
          await app.db
            .update(tenants)
            .set({ status: "suspended", updatedAt: now })
            .where(eq(tenants.id, updated.tenantId));
        }

        await writeAudit(app, {
          action: `subscription.${triggerType}`,
          tenantId: updated.tenantId,
          resourceType: "subscription",
          resourceId: updated.id,
          metadata: { triggerType, paymobSubscriptionId: subId },
          request,
        });
      }

      return { ok: true };
    }

    // Transaction object callbacks (optional first CIT confirmation)
    const obj = body.obj ?? asRecord(body);
    if (obj && (obj.id != null || body.type === "TRANSACTION")) {
      const provided =
        body.hmac ??
        (request.query as { hmac?: string }).hmac ??
        "";
      if (
        provided &&
        !verifyTransactionHmac(config.hmacSecret, obj, provided)
      ) {
        return reply.code(401).send({ error: "Invalid HMAC" });
      }

      const txId = String(obj.id ?? "unknown");
      const triggerTypeTx = obj.success === true || obj.success === "true"
        ? "charge"
        : "failure";

      const inserted = await app.db
        .insert(paymentEvents)
        .values({
          provider: "paymob",
          externalId: txId,
          triggerType: `tx_${triggerTypeTx}`,
          payload: body as Record<string, unknown>,
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

      const order = asRecord(obj.order);
      const orderId = String(order?.id ?? obj.order ?? "");
      const extras = asRecord(obj.payment_key_claims) ?? asRecord(obj.extra);
      const specialRef =
        (extras?.extra as Record<string, unknown> | undefined)
          ?.tenant_subscription_ref ??
        extras?.tenant_subscription_ref ??
        obj.merchant_order_id;

      let matched = orderId
        ? await app.db.query.tenantSubscriptions.findFirst({
            where: eq(tenantSubscriptions.paymobOrderId, orderId),
          })
        : null;

      if (!matched && typeof specialRef === "string") {
        const tenantMatch = specialRef.match(/^tenant:([0-9a-f-]{36})/i);
        if (tenantMatch) {
          matched = await app.db.query.tenantSubscriptions.findFirst({
            where: eq(tenantSubscriptions.tenantId, tenantMatch[1]),
          });
        }
      }

      if (matched && triggerTypeTx === "charge") {
        const now = new Date();
        const [updated] = await app.db
          .update(tenantSubscriptions)
          .set({
            status: "active",
            paymobOrderId: orderId || matched.paymobOrderId,
            currentPeriodStart: now,
            currentPeriodEnd: new Date(
              now.getTime() + 30 * 24 * 60 * 60 * 1000,
            ),
            updatedAt: now,
          })
          .where(eq(tenantSubscriptions.id, matched.id))
          .returning();

        await app.db
          .update(paymentEvents)
          .set({
            tenantId: updated.tenantId,
            subscriptionId: updated.id,
          })
          .where(eq(paymentEvents.id, inserted[0].id));

        await writeAudit(app, {
          action: "subscription.charge",
          tenantId: updated.tenantId,
          resourceType: "subscription",
          resourceId: updated.id,
          metadata: { source: "transaction", txId, orderId },
          request,
        });
      }

      return { ok: true };
    }

    return reply.code(400).send({ error: "Unrecognized webhook payload" });
  });
};
