import type { FastifyPluginAsync } from "fastify";
import { and, count, desc, eq, gte, inArray } from "drizzle-orm";
import {
  leads,
  paymentEvents,
  plans,
  platformModules,
  tenantSubscriptions,
  tenants,
  users,
} from "@hr/db";
import {
  cleanFeatureOverrides,
  enterTenantSchema,
  isSeatQuoteCode,
  MODULE_DEFINITIONS,
  MODULE_KEYS,
  MODULE_LABELS,
  PACK_GROUP_LABELS,
  quoteForSeats,
  sanitizePlanFeatures,
  updateModuleLaunchSchema,
  workspacePreviewSchema,
  type FeatureOverrides,
  type JwtPayload,
  type ModuleKey,
  type ModuleLaunchStatus,
  type SeatQuoteCode,
  type WorkspaceMode,
} from "@hr/shared";
import { writeAudit } from "../lib/audit.js";
import {
  moduleRolesOf,
  signTokens,
  toAuthUser,
} from "../lib/auth-tokens.js";
import {
  getTenantSubscription,
} from "../lib/billing.js";
import {
  getTenantPlanFeatures,
  loadModuleLaunchMap,
  resolvePingIntervalSec,
} from "../lib/features.js";
import { requireRoles } from "../types.js";

async function buildWorkspaceUser(
  app: Parameters<typeof signTokens>[0],
  db: import("@hr/db").Db,
  user: typeof users.$inferSelect,
  tenant: typeof tenants.$inferSelect,
  workspaceMode: WorkspaceMode,
  previewPlanId: string | null,
) {
  const payload: JwtPayload = {
    sub: user.id,
    role: "super_admin",
    tenantId: tenant.id,
    employeeId: null,
    systemModuleRoles: moduleRolesOf(user),
    workspaceMode,
    previewPlanId,
  };
  const tokens = signTokens(app, payload);

  const current = await getTenantSubscription(db, tenant.id);
  const features = await getTenantPlanFeatures(db, tenant.id, {
    mode: workspaceMode,
    previewPlanId,
    isPlatformLab: tenant.settings.platformLab === true,
  });

  let previewPlan: { id: string; code: string; name: string } | null = null;
  if (previewPlanId) {
    const plan = await db.query.plans.findFirst({
      where: eq(plans.id, previewPlanId),
    });
    if (plan) {
      previewPlan = { id: plan.id, code: plan.code, name: plan.name };
    }
  }

  return {
    ...tokens,
    user: {
      ...toAuthUser(user, null),
      tenantId: tenant.id,
      plan: current?.plan
        ? {
            code: current.plan.code,
            name: current.plan.name,
            seatLimit: current.plan.seatLimit,
          }
        : null,
      planFeatures: features,
      accessAllowed: true,
      subscriptionStatus: current?.subscription?.status ?? null,
      trialEndsAt: current?.subscription?.trialEndsAt?.toISOString() ?? null,
      pingIntervalSec: resolvePingIntervalSec(
        tenant.settings.pingIntervalSec,
        features,
      ),
      workspace: {
        mode: workspaceMode,
        previewPlanId: previewPlan?.id ?? null,
        previewPlanCode: previewPlan?.code ?? null,
        previewPlanName: previewPlan?.name ?? null,
        platformLab: tenant.settings.platformLab === true,
        tenantSlug: tenant.slug,
        tenantName: tenant.name,
      },
    },
    tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
  };
}

export const platformRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", requireRoles("super_admin"));

  app.get("/overview", async () => {
    const tenantRows = await app.db
      .select({ status: tenants.status, n: count() })
      .from(tenants)
      .groupBy(tenants.status);

    const tenantsByStatus: Record<string, number> = {
      active: 0,
      suspended: 0,
      deleted: 0,
    };
    for (const row of tenantRows) {
      tenantsByStatus[row.status] = Number(row.n);
    }

    const subRows = await app.db
      .select({ status: tenantSubscriptions.status, n: count() })
      .from(tenantSubscriptions)
      .groupBy(tenantSubscriptions.status);

    const subscriptionsByStatus: Record<string, number> = {
      trialing: 0,
      active: 0,
      past_due: 0,
      canceled: 0,
      expired: 0,
    };
    for (const row of subRows) {
      subscriptionsByStatus[row.status] = Number(row.n);
    }

    const billable = await app.db
      .select({
        amountCents: plans.amountCents,
        code: plans.code,
        purchasedSeats: tenantSubscriptions.purchasedSeats,
        status: tenantSubscriptions.status,
      })
      .from(tenantSubscriptions)
      .innerJoin(plans, eq(tenantSubscriptions.planId, plans.id))
      .where(inArray(tenantSubscriptions.status, ["active", "past_due"]));

    let mrrCents = 0;
    for (const row of billable) {
      if (isSeatQuoteCode(row.code) && row.purchasedSeats != null) {
        mrrCents += quoteForSeats(row.code as SeatQuoteCode, row.purchasedSeats);
      } else {
        mrrCents += row.amountCents;
      }
    }

    const [newLeadsRow] = await app.db
      .select({ n: count() })
      .from(leads)
      .where(eq(leads.status, "new"));

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [demos7] = await app.db
      .select({ n: count() })
      .from(leads)
      .where(
        and(
          inArray(leads.source, ["demo", "enterprise"]),
          gte(leads.createdAt, sevenDaysAgo),
        ),
      );
    const [demos30] = await app.db
      .select({ n: count() })
      .from(leads)
      .where(
        and(
          inArray(leads.source, ["demo", "enterprise"]),
          gte(leads.createdAt, thirtyDaysAgo),
        ),
      );

    const activePaid = Number(subscriptionsByStatus.active ?? 0);
    const openTrials = Number(subscriptionsByStatus.trialing ?? 0);

    const recentLeads = await app.db.query.leads.findMany({
      orderBy: (t, { desc: d }) => [d(t.createdAt)],
      limit: 10,
    });

    const recentPayments = await app.db
      .select({
        event: paymentEvents,
        tenantName: tenants.name,
        tenantSlug: tenants.slug,
      })
      .from(paymentEvents)
      .leftJoin(tenants, eq(paymentEvents.tenantId, tenants.id))
      .orderBy(desc(paymentEvents.processedAt))
      .limit(10);

    const lab = await app.db.query.tenants.findFirst({
      where: eq(tenants.slug, "elevora-lab"),
    });

    return {
      tenantsByStatus,
      subscriptionsByStatus,
      mrrCents,
      mrrCurrency: "USD",
      funnel: {
        newLeads: Number(newLeadsRow?.n ?? 0),
        demosLast7Days: Number(demos7?.n ?? 0),
        demosLast30Days: Number(demos30?.n ?? 0),
        activePaidTenants: activePaid,
        openTrials,
      },
      recentLeads,
      recentPaymentEvents: recentPayments.map((r) => ({
        ...r.event,
        tenant: r.event.tenantId
          ? {
              id: r.event.tenantId,
              name: r.tenantName,
              slug: r.tenantSlug,
            }
          : null,
      })),
      labTenant: lab
        ? { id: lab.id, name: lab.name, slug: lab.slug }
        : null,
    };
  });

  /** Enter a tenant workspace for product testing (JWT gains tenantId). */
  app.post("/enter-tenant", async (request, reply) => {
    const parsed = enterTenantSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const actor = request.user as JwtPayload;
    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, parsed.data.tenantId),
    });
    if (!tenant || tenant.status === "deleted") {
      return reply.code(404).send({ error: "Tenant not found" });
    }

    const user = await app.db.query.users.findFirst({
      where: eq(users.id, actor.sub),
    });
    if (!user || user.role !== "super_admin") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    let workspaceMode = parsed.data.workspaceMode ?? "unlock_all";
    let previewPlanId = parsed.data.previewPlanId ?? null;

    if (workspaceMode === "preview_plan") {
      if (!previewPlanId) {
        return reply.code(400).send({ error: "previewPlanId required for preview_plan" });
      }
      const plan = await app.db.query.plans.findFirst({
        where: eq(plans.id, previewPlanId),
      });
      if (!plan) return reply.code(404).send({ error: "Plan not found" });
    } else {
      previewPlanId = null;
    }

    const result = await buildWorkspaceUser(
      app,
      app.db,
      user,
      tenant,
      workspaceMode,
      previewPlanId,
    );

    await writeAudit(app, {
      actor,
      action: "platform.enter_tenant",
      tenantId: tenant.id,
      resourceType: "tenant",
      resourceId: tenant.id,
      metadata: {
        slug: tenant.slug,
        workspaceMode,
        previewPlanId,
      },
      request,
    });

    return result;
  });

  /** Switch workspace mode / plan preview without leaving the tenant. */
  app.patch("/workspace-preview", async (request, reply) => {
    const parsed = workspacePreviewSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const actor = request.user as JwtPayload;
    if (!actor.tenantId) {
      return reply.code(400).send({ error: "Enter a tenant workspace first" });
    }

    const user = await app.db.query.users.findFirst({
      where: eq(users.id, actor.sub),
    });
    if (!user || user.role !== "super_admin") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const tenant = await app.db.query.tenants.findFirst({
      where: eq(tenants.id, actor.tenantId),
    });
    if (!tenant || tenant.status === "deleted") {
      return reply.code(404).send({ error: "Tenant not found" });
    }

    let workspaceMode = parsed.data.workspaceMode;
    let previewPlanId = parsed.data.previewPlanId ?? null;
    if (workspaceMode === "preview_plan") {
      if (!previewPlanId) {
        return reply.code(400).send({ error: "previewPlanId required for preview_plan" });
      }
      const plan = await app.db.query.plans.findFirst({
        where: eq(plans.id, previewPlanId),
      });
      if (!plan) return reply.code(404).send({ error: "Plan not found" });
    } else {
      previewPlanId = null;
    }

    return buildWorkspaceUser(
      app,
      app.db,
      user,
      tenant,
      workspaceMode,
      previewPlanId,
    );
  });

  /** Leave tenant workspace; restore platform-only JWT. */
  app.post("/exit-tenant", async (request, reply) => {
    const actor = request.user as JwtPayload;
    const user = await app.db.query.users.findFirst({
      where: eq(users.id, actor.sub),
    });
    if (!user || user.role !== "super_admin") {
      return reply.code(403).send({ error: "Forbidden" });
    }

    const payload: JwtPayload = {
      sub: user.id,
      role: "super_admin",
      tenantId: null,
      employeeId: null,
      systemModuleRoles: moduleRolesOf(user),
      workspaceMode: undefined,
      previewPlanId: null,
    };
    const tokens = signTokens(app, payload);

    if (actor.tenantId) {
      await writeAudit(app, {
        actor: { ...actor, tenantId: null },
        action: "platform.exit_tenant",
        tenantId: actor.tenantId,
        resourceType: "tenant",
        resourceId: actor.tenantId,
        request,
      });
    }

    return {
      ...tokens,
      user: toAuthUser(user, null),
    };
  });

  app.get("/lab", async (_request, reply) => {
    const lab = await app.db.query.tenants.findFirst({
      where: eq(tenants.slug, "elevora-lab"),
    });
    if (!lab) return reply.code(404).send({ error: "Lab tenant not seeded" });
    return { id: lab.id, name: lab.name, slug: lab.slug };
  });

  app.patch("/modules/:key/launch", async (request, reply) => {
    const { key } = request.params as { key: string };
    if (!(MODULE_KEYS as readonly string[]).includes(key)) {
      return reply.code(404).send({ error: "Unknown module" });
    }
    const parsed = updateModuleLaunchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const existing = await app.db.query.platformModules.findFirst({
      where: eq(platformModules.key, key),
    });
    if (existing) {
      const [updated] = await app.db
        .update(platformModules)
        .set({
          launchStatus: parsed.data.launchStatus,
          updatedAt: new Date(),
        })
        .where(eq(platformModules.key, key))
        .returning();
      return updated;
    }
    const [created] = await app.db
      .insert(platformModules)
      .values({
        key,
        launchStatus: parsed.data.launchStatus,
      })
      .returning();
    return created;
  });

  app.get("/features", async () => {
    const planRows = await app.db.query.plans.findMany({
      orderBy: (p, { asc }) => [asc(p.code)],
    });
    const tenantRows = await app.db
      .select({
        id: tenants.id,
        name: tenants.name,
        slug: tenants.slug,
        status: tenants.status,
        settings: tenants.settings,
      })
      .from(tenants);

    const launchMap = await loadModuleLaunchMap(app.db);

    const overrideCounts = Object.fromEntries(
      MODULE_KEYS.map((key) => [key, { on: 0, off: 0 }]),
    ) as Record<ModuleKey, { on: number; off: number }>;

    const tenantsWithOverrides: Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      overrides: FeatureOverrides;
    }> = [];

    for (const row of tenantRows) {
      const overrides = cleanFeatureOverrides(row.settings?.featureOverrides);
      if (Object.keys(overrides).length === 0) continue;
      tenantsWithOverrides.push({
        id: row.id,
        name: row.name,
        slug: row.slug,
        status: row.status,
        overrides,
      });
      for (const key of MODULE_KEYS) {
        if (overrides[key] === true) overrideCounts[key].on += 1;
        if (overrides[key] === false) overrideCounts[key].off += 1;
      }
    }

    tenantsWithOverrides.sort((a, b) => a.name.localeCompare(b.name));

    const lab = await app.db.query.tenants.findFirst({
      where: eq(tenants.slug, "elevora-lab"),
    });

    return {
      keys: MODULE_KEYS.map((key) => ({
        key,
        label: MODULE_LABELS[key],
        pack: MODULE_DEFINITIONS.find((d) => d.key === key)!.pack,
        packLabel: PACK_GROUP_LABELS[MODULE_DEFINITIONS.find((d) => d.key === key)!.pack],
        launchStatus: launchMap[key],
      })),
      packs: Object.entries(PACK_GROUP_LABELS).map(([key, label]) => ({
        key,
        label,
      })),
      modules: MODULE_DEFINITIONS.map((d) => ({
        key: d.key,
        label: d.label,
        pack: d.pack,
        href: d.href,
        launchStatus: launchMap[d.key] as ModuleLaunchStatus,
      })),
      plans: planRows.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        active: p.active,
        amountCents: p.amountCents,
        features: sanitizePlanFeatures(
          (p.features ?? {}) as Record<string, boolean | number | string>,
        ),
      })),
      overrideCounts,
      tenantsWithOverrides,
      labTenant: lab
        ? { id: lab.id, name: lab.name, slug: lab.slug }
        : null,
    };
  });
};
