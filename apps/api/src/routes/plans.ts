import type { FastifyPluginAsync } from "fastify";
import { and, eq, inArray } from "drizzle-orm";
import { plans } from "@hr/db";
import {
  createPlanSchema,
  updatePlanSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  createPolarClient,
  createPolarProductForPlan,
  getPolarConfig,
} from "../lib/polar.js";
import { requireRoles } from "../types.js";

const BILLABLE_CODES = ["field", "people", "ops", "scale"] as const;

export const planRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireRoles("super_admin"));

  app.get("/", async () => {
    const rows = await app.db.query.plans.findMany({
      orderBy: (t, { asc }) => [asc(t.amountCents), asc(t.name)],
    });
    return { plans: rows };
  });

  /** Idempotent: create Polar products for catalog plans missing polar_product_id. */
  app.post("/sync-polar", async (request, reply) => {
    const config = getPolarConfig();
    if (!config) {
      return reply.code(503).send({
        error: "Polar is not configured. Set POLAR_ACCESS_TOKEN.",
      });
    }

    const catalog = await app.db.query.plans.findMany({
      where: and(
        eq(plans.active, true),
        inArray(plans.code, [...BILLABLE_CODES]),
      ),
    });

    const polar = createPolarClient(config);
    const results: Array<{
      code: string;
      polarProductId: string;
      created: boolean;
    }> = [];

    for (const plan of catalog) {
      if (plan.polarProductId) {
        results.push({
          code: plan.code,
          polarProductId: plan.polarProductId,
          created: false,
        });
        continue;
      }
      if (plan.amountCents <= 0) continue;

      try {
        const created = await createPolarProductForPlan(polar, {
          code: plan.code,
          name: plan.name,
          description: plan.description,
          amountCents: plan.amountCents,
          currency: plan.currency,
        });
        await app.db
          .update(plans)
          .set({ polarProductId: created.id, updatedAt: new Date() })
          .where(eq(plans.id, plan.id));
        results.push({
          code: plan.code,
          polarProductId: created.id,
          created: true,
        });
      } catch (err) {
        return reply.code(502).send({
          error:
            err instanceof Error
              ? err.message
              : `Failed to sync plan ${plan.code} with Polar`,
          results,
        });
      }
    }

    const actor = request.user as JwtPayload;
    await writeAudit(app, {
      actor,
      action: "plans.sync_polar",
      resourceType: "plan",
      metadata: { results },
      request,
    });

    return { results };
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

    let polarProductId: string | null = null;
    const syncPolar = data.syncPolar === true && data.amountCents > 0;
    if (syncPolar) {
      const config = getPolarConfig();
      if (!config) {
        return reply.code(503).send({
          error:
            "Polar is not configured. Set POLAR_ACCESS_TOKEN or create with syncPolar:false",
        });
      }
      try {
        const polar = createPolarClient(config);
        const created = await createPolarProductForPlan(polar, {
          code: data.code,
          name: data.name,
          description: data.description ?? null,
          amountCents: data.amountCents,
          currency: data.currency,
        });
        polarProductId = created.id;
      } catch (err) {
        return reply.code(502).send({
          error:
            err instanceof Error
              ? err.message
              : "Failed to sync plan with Polar",
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
        polarProductId,
      })
      .returning();

    const actor = request.user as JwtPayload;
    await writeAudit(app, {
      actor,
      action: "plan.create",
      resourceType: "plan",
      resourceId: plan.id,
      metadata: { code: plan.code, polarProductId },
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

    let polarProductId = current.polarProductId;
    const nextAmount = parsed.data.amountCents ?? current.amountCents;
    const syncPolar =
      parsed.data.syncPolar === true &&
      !current.polarProductId &&
      nextAmount > 0;
    if (syncPolar) {
      const config = getPolarConfig();
      if (!config) {
        return reply.code(503).send({ error: "Polar is not configured" });
      }
      try {
        const polar = createPolarClient(config);
        const created = await createPolarProductForPlan(polar, {
          code: current.code,
          name: parsed.data.name ?? current.name,
          description:
            parsed.data.description === undefined
              ? current.description
              : parsed.data.description,
          amountCents: nextAmount,
          currency: parsed.data.currency ?? current.currency,
        });
        polarProductId = created.id;
      } catch (err) {
        return reply.code(502).send({
          error:
            err instanceof Error
              ? err.message
              : "Failed to sync plan with Polar",
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
        polarProductId,
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
