import type { FastifyPluginAsync } from "fastify";
import { and, count, eq } from "drizzle-orm";
import {
  integrationConnections,
  tenants,
} from "@hr/db";
import {
  createTenantSchema,
  updateTenantSchema,
  type JwtPayload,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  countActiveSeats,
  effectiveSeatLimit,
  getTenantSubscription,
} from "../lib/billing.js";
import {
  getTenantPlanFeatures,
  resolveLocationRetentionDays,
  resolvePingIntervalSec,
} from "../lib/features.js";
import { provisionTenant } from "../lib/tenant-provision.js";
import { requireRoles } from "../types.js";

export const tenantRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireRoles("super_admin"));

  app.get("/", async () => {
    const rows = await app.db.query.tenants.findMany({
      orderBy: (t, { asc }) => [asc(t.name)],
    });
    const tenantsWithSubs = await Promise.all(
      rows.map(async (tenant) => {
        const current = await getTenantSubscription(app.db, tenant.id);
        const seatsUsed = await countActiveSeats(app.db, tenant.id);
        return {
          ...tenant,
          subscription: current?.subscription
            ? {
                id: current.subscription.id,
                status: current.subscription.status,
                planId: current.subscription.planId,
                currentPeriodEnd: current.subscription.currentPeriodEnd,
                cancelAtPeriodEnd: current.subscription.cancelAtPeriodEnd,
              }
            : null,
          plan: current?.plan
            ? {
                id: current.plan.id,
                code: current.plan.code,
                name: current.plan.name,
                seatLimit: effectiveSeatLimit(
                  current.subscription,
                  current.plan,
                ),
              }
            : null,
          seatsUsed,
        };
      }),
    );
    return { tenants: tenantsWithSubs };
  });

  app.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });
    if (!tenant) return reply.code(404).send({ error: "Not found" });
    const current = await getTenantSubscription(app.db, id);
    const seatsUsed = await countActiveSeats(app.db, id);
    const [connCount] = await app.db
      .select({ n: count() })
      .from(integrationConnections)
      .where(eq(integrationConnections.tenantId, id));
    const [activeCount] = await app.db
      .select({ n: count() })
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.tenantId, id),
          eq(integrationConnections.status, "active"),
        ),
      );
    const [errorCount] = await app.db
      .select({ n: count() })
      .from(integrationConnections)
      .where(
        and(
          eq(integrationConnections.tenantId, id),
          eq(integrationConnections.status, "error"),
        ),
      );
    const latest = await app.db.query.integrationConnections.findFirst({
      where: eq(integrationConnections.tenantId, id),
      orderBy: (t, { desc }) => [desc(t.lastSyncAt)],
    });
    return {
      tenant,
      subscription: current?.subscription ?? null,
      plan: current?.plan ?? null,
      seatsUsed,
      seatLimit: effectiveSeatLimit(current?.subscription, current?.plan),
      integrationHealth: {
        connections: Number(connCount?.n ?? 0),
        active: Number(activeCount?.n ?? 0),
        error: Number(errorCount?.n ?? 0),
        lastSyncAt: latest?.lastSyncAt ?? null,
      },
    };
  });

  app.post("/", async (request, reply) => {
    const parsed = createTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const provisioned = await provisionTenant(app.db, parsed.data);
    if (!provisioned.ok) {
      return reply.code(provisioned.status).send({ error: provisioned.error });
    }
    const { tenant, admin, subscription } = provisioned.result;

    const actor = request.user as JwtPayload;
    await writeAudit(app, {
      actor,
      action: "tenant.create",
      tenantId: tenant.id,
      resourceType: "tenant",
      resourceId: tenant.id,
      metadata: {
        slug: tenant.slug,
        adminEmail: admin.email,
        trialSubscriptionId: subscription?.id ?? null,
      },
      request,
    });

    return reply.code(201).send({
      tenant,
      admin: { id: admin.id, email: admin.email },
      subscription,
    });
  });

  app.patch("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = updateTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const current = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, id),
    });
    if (!current) return reply.code(404).send({ error: "Not found" });

    const incomingSettings = parsed.data.settings ?? {};
    const features = await getTenantPlanFeatures(app.db, id);
    const mergedSettings = {
      ...current.settings,
      ...incomingSettings,
      map: incomingSettings.map
        ? { ...(current.settings.map ?? {}), ...incomingSettings.map }
        : current.settings.map,
    };
    if (incomingSettings.pingIntervalSec !== undefined) {
      mergedSettings.pingIntervalSec = resolvePingIntervalSec(
        incomingSettings.pingIntervalSec,
        features,
      );
    }
    if (incomingSettings.locationRetentionDays !== undefined) {
      mergedSettings.locationRetentionDays = resolveLocationRetentionDays(
        incomingSettings.locationRetentionDays,
        features,
      );
    }
    const nextSettings = mergedSettings;

    const [updated] = await app.db
      .update(tenants)
      .set({
        name: parsed.data.name ?? current.name,
        status: parsed.data.status ?? current.status,
        settings: nextSettings,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, id))
      .returning();

    const actor = request.user as JwtPayload;
    let action = "tenant.update";
    if (parsed.data.status && parsed.data.status !== current.status) {
      if (parsed.data.status === "suspended") action = "tenant.suspend";
      else if (parsed.data.status === "active") action = "tenant.activate";
      else if (parsed.data.status === "deleted") action = "tenant.delete";
    }

    await writeAudit(app, {
      actor,
      action,
      tenantId: updated.id,
      resourceType: "tenant",
      resourceId: updated.id,
      metadata: {
        before: { name: current.name, status: current.status, settings: current.settings },
        after: { name: updated.name, status: updated.status, settings: updated.settings },
      },
      request,
    });

    return { tenant: updated };
  });

  app.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const [updated] = await app.db
      .update(tenants)
      .set({ status: "deleted", updatedAt: new Date() })
      .where(eq(tenants.id, id))
      .returning();
    if (!updated) return reply.code(404).send({ error: "Not found" });

    const actor = request.user as JwtPayload;
    await writeAudit(app, {
      actor,
      action: "tenant.delete",
      tenantId: updated.id,
      resourceType: "tenant",
      resourceId: updated.id,
      metadata: { soft: true },
      request,
    });

    return { tenant: updated };
  });
};
