import type { FastifyPluginAsync } from "fastify";
import { eq } from "drizzle-orm";
import { plans } from "@hr/db";
import { createPlanSchema, updatePlanSchema, type JwtPayload } from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  createPaymobSubscriptionPlan,
  getPaymobConfig,
} from "../lib/paymob.js";
import { requireRoles } from "../types.js";

export const planRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireRoles("super_admin"));

  app.get("/", async () => {
    const rows = await app.db.query.plans.findMany({
      orderBy: (t, { asc }) => [asc(t.amountCents), asc(t.name)],
    });
    return { plans: rows };
  });

  app.post("/", async (request, reply) => {
    const parsed = createPlanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const data = parsed.data;
    const existing = await app.db.query.plans.findFirst({
      where: eq(plans.code, data.code),
    });
    if (existing) {
      return reply.code(409).send({ error: "Plan code already exists" });
    }

    let paymobPlanId: number | null = null;
    const syncPaymob = data.syncPaymob === true && data.amountCents > 0;
    if (syncPaymob) {
      const config = getPaymobConfig();
      if (!config) {
        return reply.code(503).send({
          error:
            "Paymob is not configured. Set PAYMOB_* env vars or create with syncPaymob:false",
        });
      }
      try {
        const created = await createPaymobSubscriptionPlan(config, {
          name: data.name,
          amountCents: data.amountCents,
          currency: data.currency,
          frequencyDays: data.intervalDays,
        });
        paymobPlanId = created.id;
      } catch (err) {
        return reply.code(502).send({
          error:
            err instanceof Error
              ? err.message
              : "Failed to sync plan with Paymob",
        });
      }
    }

    const [plan] = await app.db
      .insert(plans)
      .values({
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        amountCents: data.amountCents,
        currency: data.currency,
        intervalDays: data.intervalDays,
        seatLimit: data.seatLimit ?? null,
        active: data.active ?? true,
        features: data.features ?? {},
        paymobPlanId,
      })
      .returning();

    const actor = request.user as JwtPayload;
    await writeAudit(app, {
      actor,
      action: "plan.create",
      resourceType: "plan",
      resourceId: plan.id,
      metadata: { code: plan.code, paymobPlanId },
      request,
    });

    return reply.code(201).send({ plan });
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updatePlanSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const current = await app.db.query.plans.findFirst({
      where: eq(plans.id, id),
    });
    if (!current) return reply.code(404).send({ error: "Not found" });

    let paymobPlanId = current.paymobPlanId;
    const nextAmount = parsed.data.amountCents ?? current.amountCents;
    const syncPaymob =
      parsed.data.syncPaymob === true &&
      !current.paymobPlanId &&
      nextAmount > 0;
    if (syncPaymob) {
      const config = getPaymobConfig();
      if (!config) {
        return reply
          .code(503)
          .send({ error: "Paymob is not configured" });
      }
      try {
        const created = await createPaymobSubscriptionPlan(config, {
          name: parsed.data.name ?? current.name,
          amountCents: nextAmount,
          currency: parsed.data.currency ?? current.currency,
          frequencyDays: parsed.data.intervalDays ?? current.intervalDays,
        });
        paymobPlanId = created.id;
      } catch (err) {
        return reply.code(502).send({
          error:
            err instanceof Error
              ? err.message
              : "Failed to sync plan with Paymob",
        });
      }
    }

    const [updated] = await app.db
      .update(plans)
      .set({
        name: parsed.data.name ?? current.name,
        description:
          parsed.data.description === undefined
            ? current.description
            : parsed.data.description,
        amountCents: parsed.data.amountCents ?? current.amountCents,
        currency: parsed.data.currency ?? current.currency,
        intervalDays: parsed.data.intervalDays ?? current.intervalDays,
        seatLimit:
          parsed.data.seatLimit === undefined
            ? current.seatLimit
            : parsed.data.seatLimit,
        active: parsed.data.active ?? current.active,
        features: parsed.data.features ?? current.features,
        paymobPlanId,
        updatedAt: new Date(),
      })
      .where(eq(plans.id, id))
      .returning();

    const actor = request.user as JwtPayload;
    await writeAudit(app, {
      actor,
      action: "plan.update",
      resourceType: "plan",
      resourceId: updated.id,
      metadata: { before: current, after: updated },
      request,
    });

    return { plan: updated };
  });
};
