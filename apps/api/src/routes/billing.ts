import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import { plans, tenantSubscriptions, users } from "@hr/db";
import {
  billingCheckoutSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  countActiveSeats,
  getTenantSubscription,
  subscriptionAllowsAccess,
} from "../lib/billing.js";
import {
  checkoutUrlFromIntention,
  createPaymobIntention,
  cancelPaymobSubscription,
  getPaymobConfig,
  isPaymobConfigured,
} from "../lib/paymob.js";
import { requireRoles, requireTenantScope, tenantIdOf } from "../types.js";

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireTenantScope());
  app.addHook("preHandler", requireRoles("tenant_admin"));

  app.get("/current", async (request) => {
    const tenantId = tenantIdOf(request);
    const current = await getTenantSubscription(app.db, tenantId);
    const seatsUsed = await countActiveSeats(app.db, tenantId);
    const catalog = await app.db.query.plans.findMany({
      where: and(eq(plans.active, true)),
      orderBy: (t, { asc }) => [asc(t.amountCents)],
    });
    return {
      subscription: current?.subscription ?? null,
      plan: current?.plan ?? null,
      seatsUsed,
      seatLimit: current?.plan?.seatLimit ?? null,
      accessAllowed: subscriptionAllowsAccess(current?.subscription?.status),
      paymobConfigured: isPaymobConfigured(),
      availablePlans: catalog.filter((p) => p.code !== "trial"),
    };
  });

  app.post("/checkout", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const parsed = billingCheckoutSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const config = getPaymobConfig();
    if (!config) {
      return reply.code(503).send({
        error: "Billing is not configured. Contact platform support.",
      });
    }

    const plan = await app.db.query.plans.findFirst({
      where: and(eq(plans.id, parsed.data.planId), eq(plans.active, true)),
    });
    if (!plan) return reply.code(404).send({ error: "Plan not found" });
    if (!plan.paymobPlanId || plan.amountCents <= 0) {
      return reply.code(400).send({
        error: "Plan is not billable via Paymob",
      });
    }

    const admin = await app.db.query.users.findFirst({
      where: eq(users.id, actor.sub),
    });
    if (!admin) return reply.code(401).send({ error: "Unauthorized" });

    const nameParts = admin.name.trim().split(/\s+/);
    const firstName = nameParts[0] || "Admin";
    const lastName = nameParts.slice(1).join(" ") || "User";
    const specialReference = `tenant:${tenantId}:plan:${plan.id}:${Date.now()}`;

    let intention;
    try {
      intention = await createPaymobIntention(config, {
        amountCents: plan.amountCents,
        currency: plan.currency,
        subscriptionPlanId: plan.paymobPlanId,
        specialReference,
        customer: {
          firstName,
          lastName,
          email: admin.email,
          phone: parsed.data.billingData?.phone ?? "0000000000",
        },
        billingData: parsed.data.billingData,
      });
    } catch (err) {
      return reply.code(502).send({
        error:
          err instanceof Error ? err.message : "Failed to start Paymob checkout",
      });
    }

    const orderId = String(
      intention.intention_order_id ??
        intention.order?.id ??
        intention.id ??
        "",
    );

    const existing = await app.db.query.tenantSubscriptions.findFirst({
      where: eq(tenantSubscriptions.tenantId, tenantId),
    });
    if (existing) {
      await app.db
        .update(tenantSubscriptions)
        .set({
          planId: plan.id,
          paymobOrderId: orderId || existing.paymobOrderId,
          updatedAt: new Date(),
        })
        .where(eq(tenantSubscriptions.id, existing.id));
    } else {
      const now = new Date();
      await app.db.insert(tenantSubscriptions).values({
        tenantId,
        planId: plan.id,
        status: "trialing",
        paymobOrderId: orderId || null,
        currentPeriodStart: now,
        currentPeriodEnd: new Date(
          now.getTime() + plan.intervalDays * 24 * 60 * 60 * 1000,
        ),
      });
    }

    let checkoutUrl: string;
    try {
      checkoutUrl = checkoutUrlFromIntention(config, intention);
    } catch (err) {
      return reply.code(502).send({
        error:
          err instanceof Error ? err.message : "Missing Paymob checkout URL",
      });
    }

    await writeAudit(app, {
      actor,
      action: "subscription.checkout",
      tenantId,
      resourceType: "plan",
      resourceId: plan.id,
      metadata: { specialReference, orderId, amountCents: plan.amountCents },
      request,
    });

    return {
      checkoutUrl,
      clientSecret: intention.client_secret ?? null,
      publicKey: config.publicKey || null,
      orderId: orderId || null,
    };
  });

  app.post("/cancel", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const current = await getTenantSubscription(app.db, tenantId);
    if (!current?.subscription) {
      return reply.code(404).send({ error: "No subscription" });
    }

    if (current.subscription.paymobSubscriptionId) {
      const config = getPaymobConfig();
      if (config) {
        try {
          await cancelPaymobSubscription(
            config,
            current.subscription.paymobSubscriptionId,
          );
        } catch (err) {
          app.log.warn({ err }, "Paymob cancel failed");
        }
      }
    }

    const [updated] = await app.db
      .update(tenantSubscriptions)
      .set({
        cancelAtPeriodEnd: true,
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.id, current.subscription.id))
      .returning();

    await writeAudit(app, {
      actor,
      action: "subscription.cancel",
      tenantId,
      resourceType: "subscription",
      resourceId: updated.id,
      metadata: { cancelAtPeriodEnd: true },
      request,
    });

    return { subscription: updated };
  });
};
