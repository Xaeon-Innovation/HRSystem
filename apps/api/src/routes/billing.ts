import type { FastifyPluginAsync } from "fastify";
import { and, eq } from "drizzle-orm";
import { plans, tenantSubscriptions, users } from "@hr/db";
import {
  billingCheckoutSchema,
  billingSeatsSchema,
  isSeatQuoteCode,
  SEAT_QUOTES,
  validateSeatCount,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  countActiveSeats,
  effectiveSeatLimit,
  getTenantSubscription,
  subscriptionAllowsAccess,
} from "../lib/billing.js";
import {
  cancelPolarSubscriptionAtPeriodEnd,
  createPolarCheckout,
  createPolarClient,
  createPolarCustomerPortalSession,
  getPolarConfig,
  isPolarConfigured,
  updatePolarSubscriptionSeats,
} from "../lib/polar.js";
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
    const seatLimit = effectiveSeatLimit(current?.subscription, current?.plan);
    return {
      subscription: current?.subscription ?? null,
      plan: current?.plan ?? null,
      seatsUsed,
      seatLimit,
      purchasedSeats: current?.subscription?.purchasedSeats ?? null,
      accessAllowed: subscriptionAllowsAccess(current?.subscription ?? null),
      polarConfigured: isPolarConfigured(),
      seatQuotes: SEAT_QUOTES,
      availablePlans: catalog.filter(
        (p) => p.code !== "trial" && p.amountCents > 0,
      ),
    };
  });

  app.post("/checkout", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const parsed = billingCheckoutSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const config = getPolarConfig();
    if (!config) {
      return reply.code(503).send({
        error: "Billing is not configured. Contact platform support.",
      });
    }

    const plan = await app.db.query.plans.findFirst({
      where: and(eq(plans.id, parsed.data.planId), eq(plans.active, true)),
    });
    if (!plan) return reply.code(404).send({ error: "Plan not found" });
    if (!plan.polarProductId || plan.amountCents <= 0) {
      return reply.code(400).send({
        error: "Plan is not billable via Polar",
      });
    }

    const seatError = validateSeatCount(plan.code, parsed.data.seats);
    if (seatError) {
      return reply.code(400).send({ error: seatError });
    }

    const seats = isSeatQuoteCode(plan.code)
      ? parsed.data.seats!
      : undefined;

    const seatsUsed = await countActiveSeats(app.db, tenantId);
    if (seats != null && seats < seatsUsed) {
      return reply.code(400).send({
        error: `Cannot subscribe with ${seats} seats while ${seatsUsed} employees are active`,
      });
    }

    const admin = await app.db.query.users.findFirst({
      where: eq(users.id, actor.sub),
    });
    if (!admin) return reply.code(401).send({ error: "Unauthorized" });

    const polar = createPolarClient(config);
    let checkout;
    try {
      checkout = await createPolarCheckout(polar, config, {
        productId: plan.polarProductId,
        seats,
        tenantId,
        planId: plan.id,
        customerEmail: admin.email,
        customerName: admin.name,
      });
    } catch (err) {
      return reply.code(502).send({
        error:
          err instanceof Error ? err.message : "Failed to start Polar checkout",
      });
    }

    // Do not update planId / seats until Polar confirms payment via webhook.
    // Abandoned checkouts must not unlock paid entitlements.

    await writeAudit(app, {
      actor,
      action: "subscription.checkout",
      tenantId,
      resourceType: "plan",
      resourceId: plan.id,
      metadata: {
        polarCheckoutId: checkout.id,
        seats: seats ?? null,
        amountCents: plan.amountCents,
      },
      request,
    });

    return {
      checkoutUrl: checkout.url,
      checkoutId: checkout.id,
    };
  });

  app.post("/seats", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const parsed = billingSeatsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }

    const config = getPolarConfig();
    if (!config) {
      return reply.code(503).send({
        error: "Billing is not configured. Contact platform support.",
      });
    }

    const current = await getTenantSubscription(app.db, tenantId);
    if (!current?.subscription || !current.plan) {
      return reply.code(404).send({ error: "No subscription" });
    }
    if (!isSeatQuoteCode(current.plan.code)) {
      return reply.code(400).send({
        error: "This plan does not support changeable seats",
      });
    }
    if (!current.subscription.polarSubscriptionId) {
      return reply.code(400).send({
        error: "Subscription is not linked to Polar yet",
      });
    }

    const seatError = validateSeatCount(current.plan.code, parsed.data.seats);
    if (seatError) {
      return reply.code(400).send({ error: seatError });
    }

    const seatsUsed = await countActiveSeats(app.db, tenantId);
    if (parsed.data.seats < seatsUsed) {
      return reply.code(400).send({
        error: `Cannot reduce below ${seatsUsed} active employees`,
      });
    }

    const polar = createPolarClient(config);
    try {
      await updatePolarSubscriptionSeats(
        polar,
        current.subscription.polarSubscriptionId,
        parsed.data.seats,
      );
    } catch (err) {
      return reply.code(502).send({
        error:
          err instanceof Error ? err.message : "Failed to update Polar seats",
      });
    }

    const [updated] = await app.db
      .update(tenantSubscriptions)
      .set({
        purchasedSeats: parsed.data.seats,
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.id, current.subscription.id))
      .returning();

    await writeAudit(app, {
      actor,
      action: "subscription.seats",
      tenantId,
      resourceType: "subscription",
      resourceId: updated.id,
      metadata: { seats: parsed.data.seats, seatsUsed },
      request,
    });

    return {
      subscription: updated,
      seatsUsed,
      seatLimit: parsed.data.seats,
    };
  });

  app.post("/portal", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const config = getPolarConfig();
    if (!config) {
      return reply.code(503).send({
        error: "Billing is not configured. Contact platform support.",
      });
    }

    const current = await getTenantSubscription(app.db, tenantId);
    if (!current?.subscription?.polarCustomerId) {
      return reply.code(400).send({
        error: "No Polar customer on this subscription yet",
      });
    }

    const polar = createPolarClient(config);
    try {
      const session = await createPolarCustomerPortalSession(polar, {
        customerId: current.subscription.polarCustomerId,
        returnUrl: `${config.webAppUrl}/app/billing`,
      });
      return { portalUrl: session.customerPortalUrl };
    } catch (err) {
      return reply.code(502).send({
        error:
          err instanceof Error
            ? err.message
            : "Failed to open Polar customer portal",
      });
    }
  });

  app.post("/cancel", async (request, reply) => {
    const tenantId = tenantIdOf(request);
    const actor = request.user as JwtPayload;
    const current = await getTenantSubscription(app.db, tenantId);
    if (!current?.subscription) {
      return reply.code(404).send({ error: "No subscription" });
    }

    if (current.subscription.polarSubscriptionId) {
      const config = getPolarConfig();
      if (config) {
        try {
          const polar = createPolarClient(config);
          await cancelPolarSubscriptionAtPeriodEnd(
            polar,
            current.subscription.polarSubscriptionId,
          );
        } catch (err) {
          app.log.warn({ err }, "Polar cancel failed");
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
