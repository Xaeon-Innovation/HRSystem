import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { tenantSubscriptions, tenants } from "@hr/db";
import {
  updateSubscriptionSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  countActiveSeats,
  listSubscriptionsWithDetails,
} from "../lib/billing.js";
import {
  cancelPaymobSubscription,
  getPaymobConfig,
} from "../lib/paymob.js";
import { requireRoles } from "../types.js";

export const subscriptionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireRoles("super_admin"));

  app.get("/", async () => {
    const rows = await listSubscriptionsWithDetails(app.db);
    const withSeats = await Promise.all(
      rows.map(async (row) => {
        const tenant = await app.db.query.tenants.findFirst({
          where: eq(tenants.id, row.tenantId),
        });
        const seatsUsed = await countActiveSeats(app.db, row.tenantId);
        return {
          ...row,
          tenant: tenant
            ? { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status }
            : null,
          seatsUsed,
          seatLimit: row.plan?.seatLimit ?? null,
        };
      }),
    );
    return { subscriptions: withSeats };
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateSubscriptionSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const current = await app.db.query.tenantSubscriptions.findFirst({
      where: eq(tenantSubscriptions.id, id),
    });
    if (!current) return reply.code(404).send({ error: "Not found" });

    const cancelRequested =
      parsed.data.cancelAtPeriodEnd === true ||
      parsed.data.status === "canceled";

    if (
      cancelRequested &&
      current.paymobSubscriptionId &&
      parsed.data.status === "canceled"
    ) {
      const config = getPaymobConfig();
      if (config) {
        try {
          await cancelPaymobSubscription(config, current.paymobSubscriptionId);
        } catch (err) {
          app.log.warn(
            { err },
            "Paymob cancel failed; applying local override",
          );
        }
      }
    }

    const [updated] = await app.db
      .update(tenantSubscriptions)
      .set({
        status: parsed.data.status ?? current.status,
        planId: parsed.data.planId ?? current.planId,
        cancelAtPeriodEnd:
          parsed.data.cancelAtPeriodEnd ?? current.cancelAtPeriodEnd,
        currentPeriodEnd:
          parsed.data.currentPeriodEnd === undefined
            ? current.currentPeriodEnd
            : parsed.data.currentPeriodEnd
              ? new Date(parsed.data.currentPeriodEnd)
              : null,
        trialEndsAt:
          parsed.data.trialEndsAt === undefined
            ? current.trialEndsAt
            : parsed.data.trialEndsAt
              ? new Date(parsed.data.trialEndsAt)
              : null,
        updatedAt: new Date(),
      })
      .where(eq(tenantSubscriptions.id, id))
      .returning();

    if (
      updated.status === "expired" ||
      updated.status === "canceled"
    ) {
      // Soft-suspend tenant access on hard cancel/expiry from platform override
      if (parsed.data.status === "expired" || parsed.data.status === "canceled") {
        await app.db
          .update(tenants)
          .set({ status: "suspended", updatedAt: new Date() })
          .where(eq(tenants.id, updated.tenantId));
      }
    }

    const actor = request.user as JwtPayload;
    await writeAudit(app, {
      actor,
      action: "subscription.override",
      tenantId: updated.tenantId,
      resourceType: "subscription",
      resourceId: updated.id,
      metadata: { before: current, after: updated },
      request,
    });

    return { subscription: updated };
  });
};
