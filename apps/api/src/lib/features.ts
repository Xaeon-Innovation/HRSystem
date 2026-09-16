import type { Db, PlanFeatures } from "@hr/db";
import { plans, platformModules, tenants } from "@hr/db";
import {
  DEFAULT_LOCATION_RETENTION_DAYS,
  DEFAULT_PING_INTERVAL_SEC,
  MODULE_DEFINITIONS,
  MODULE_KEYS,
  resolveEffectiveFeatures,
  sanitizePlanFeatures,
  type JwtPayload,
  type ModuleKey,
  type ModuleLaunchStatus,
  type PlanFeatureKey,
  type WorkspaceMode,
} from "@hr/shared";
import { eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireTenantScope, tenantIdOf } from "../types.js";
import {
  getTenantSubscription,
  subscriptionAllowsAccess,
} from "./billing.js";

const FEATURE_UPGRADE_HINT: Record<ModuleKey, string> = {
  liveMap: "Upgrade to Field, Ops, or Scale.",
  teamToday: "Upgrade to Field, Ops, or Scale.",
  leave: "Upgrade to People, Ops, or Scale.",
  hiring: "Upgrade to People, Ops, or Scale.",
  kpis: "Upgrade to People, Ops, or Scale.",
  compensation: "Upgrade to People, Ops, or Scale.",
  tasks: "Upgrade to People, Ops, or Scale.",
  analytics: "Upgrade to Ops or Scale.",
  integrations: "Upgrade to Scale or contact sales for Enterprise.",
};

export type WorkspaceContext = {
  mode: WorkspaceMode;
  previewPlanId?: string | null;
  isPlatformLab?: boolean;
};

export async function loadModuleLaunchMap(
  db: Db,
): Promise<Record<ModuleKey, ModuleLaunchStatus>> {
  const rows = await db.query.platformModules.findMany();
  const map = Object.fromEntries(
    MODULE_DEFINITIONS.map((d) => [d.key, d.defaultLaunch]),
  ) as Record<ModuleKey, ModuleLaunchStatus>;
  for (const row of rows) {
    if ((MODULE_KEYS as readonly string[]).includes(row.key)) {
      const status = row.launchStatus as ModuleLaunchStatus;
      if (status === "draft" || status === "lab" || status === "ga") {
        map[row.key as ModuleKey] = status;
      }
    }
  }
  return map;
}

/**
 * Apply launch rules: draft always off (unless unlock_all handled elsewhere),
 * lab only when platform Lab tenant or previewing on Lab.
 */
export function applyLaunchFilter(
  features: PlanFeatures,
  launchMap: Record<ModuleKey, ModuleLaunchStatus>,
  opts: { allowLabModules: boolean },
): PlanFeatures {
  const out: PlanFeatures = { ...features };
  for (const key of MODULE_KEYS) {
    const status = launchMap[key] ?? "ga";
    if (status === "draft") {
      out[key] = false;
    } else if (status === "lab" && !opts.allowLabModules) {
      out[key] = false;
    }
  }
  return out;
}

export async function getTenantPlanFeatures(
  db: Db,
  tenantId: string,
  workspace?: WorkspaceContext | null,
): Promise<PlanFeatures> {
  const mode = workspace?.mode ?? "as_entitled";
  if (mode === "unlock_all") {
    const all: PlanFeatures = {};
    for (const key of MODULE_KEYS) all[key] = true;
    return all;
  }

  const launchMap = await loadModuleLaunchMap(db);
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { settings: true },
  });
  const isLab =
    workspace?.isPlatformLab === true ||
    tenant?.settings.platformLab === true;

  if (mode === "preview_plan" && workspace?.previewPlanId) {
    const plan = await db.query.plans.findFirst({
      where: eq(plans.id, workspace.previewPlanId),
    });
    const base = sanitizePlanFeatures(
      (plan?.features ?? {}) as Record<string, boolean | number | string>,
    ) as PlanFeatures;
    return applyLaunchFilter(base, launchMap, {
      allowLabModules: isLab,
    });
  }

  const current = await getTenantSubscription(db, tenantId);
  if (!current?.subscription) return {};
  if (!subscriptionAllowsAccess(current.subscription)) return {};

  const effective = resolveEffectiveFeatures(
    (current.plan?.features ?? {}) as PlanFeatures,
    tenant?.settings.featureOverrides ?? null,
  ) as PlanFeatures;

  return applyLaunchFilter(effective, launchMap, {
    allowLabModules: isLab,
  });
}

/** Plan features only (no tenant overrides) — for admin UI baselines. */
export async function getTenantBasePlanFeatures(
  db: Db,
  tenantId: string,
): Promise<{
  planFeatures: PlanFeatures;
  overrides: NonNullable<
    NonNullable<(typeof tenants.$inferSelect)["settings"]>["featureOverrides"]
  >;
  effective: PlanFeatures;
  planCode: string | null;
}> {
  const current = await getTenantSubscription(db, tenantId);
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { settings: true },
  });
  const overrides = tenant?.settings.featureOverrides ?? {};
  const planFeatures = sanitizePlanFeatures(
    (current?.plan?.features ?? {}) as Record<string, boolean | number | string>,
  ) as PlanFeatures;
  const live =
    current?.subscription &&
    subscriptionAllowsAccess(current.subscription);
  const launchMap = await loadModuleLaunchMap(db);
  const isLab = tenant?.settings.platformLab === true;
  const effectiveRaw = live
    ? (resolveEffectiveFeatures(planFeatures, overrides) as PlanFeatures)
    : (resolveEffectiveFeatures({}, overrides) as PlanFeatures);
  const effective = applyLaunchFilter(effectiveRaw, launchMap, {
    allowLabModules: isLab,
  });
  return {
    planFeatures: live ? planFeatures : {},
    overrides,
    effective,
    planCode: current?.plan?.code ?? null,
  };
}

export async function tenantHasFeature(
  db: Db,
  tenantId: string,
  feature: PlanFeatureKey,
  workspace?: WorkspaceContext | null,
): Promise<boolean> {
  const features = await getTenantPlanFeatures(db, tenantId, workspace);
  return features[feature] === true;
}

export function planFeatureEnabled(
  features: PlanFeatures | null | undefined,
  feature: PlanFeatureKey,
): boolean {
  return features?.[feature] === true;
}

export function planPingIntervalSec(
  features: PlanFeatures | null | undefined,
): number | null {
  const raw = features?.pingIntervalSec;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

export function planLocationRetentionDays(
  features: PlanFeatures | null | undefined,
): number | null {
  const raw = features?.locationRetentionDays;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

/**
 * Effective GPS ping interval: never more frequent than the plan floor.
 * Higher seconds = fewer pings = lower cost.
 */
export function resolvePingIntervalSec(
  tenantPingSec: number | null | undefined,
  features: PlanFeatures | null | undefined,
): number {
  const requested = tenantPingSec ?? DEFAULT_PING_INTERVAL_SEC;
  const floor = planPingIntervalSec(features);
  if (floor == null) return requested;
  return Math.max(requested, floor);
}

/**
 * Effective location retention: never longer than the plan ceiling.
 */
export function resolveLocationRetentionDays(
  tenantDays: number | null | undefined,
  features: PlanFeatures | null | undefined,
): number {
  const requested = tenantDays ?? DEFAULT_LOCATION_RETENTION_DAYS;
  const ceiling = planLocationRetentionDays(features);
  if (ceiling == null) return requested;
  return Math.min(requested, ceiling);
}

export function workspaceFromJwt(
  user: JwtPayload | null | undefined,
): WorkspaceContext | null {
  if (!user || user.role !== "super_admin") return null;
  const mode = user.workspaceMode ?? "unlock_all";
  return {
    mode,
    previewPlanId: user.previewPlanId ?? null,
  };
}

export function requirePlanFeature(feature: PlanFeatureKey) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireActiveSubscription()(request, reply);
    if (reply.sent) return;
    const user = request.user as JwtPayload;
    const workspace = workspaceFromJwt(user);
    if (workspace?.mode === "unlock_all") return;
    // Legacy: super_admin without workspace mode still unlocks
    if (user.role === "super_admin" && !user.workspaceMode) return;
    const tenantId = tenantIdOf(request);
    const tenant = await request.server.db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: { settings: true },
    });
    const ok = await tenantHasFeature(request.server.db, tenantId, feature, {
      ...workspace,
      isPlatformLab: tenant?.settings.platformLab === true,
      mode: workspace?.mode ?? "as_entitled",
    });
    if (!ok) {
      return reply.code(403).send({
        error: `This plan does not include ${feature}. ${FEATURE_UPGRADE_HINT[feature]}`,
      });
    }
  };
}

/**
 * Block tenant product routes when trial/subscription is not live.
 * Billing routes must not use this so admins can still subscribe.
 */
export function requireActiveSubscription() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireTenantScope()(request, reply);
    if (reply.sent) return;
    const user = request.user as JwtPayload;
    const workspace = workspaceFromJwt(user);
    if (workspace?.mode === "unlock_all") return;
    if (user.role === "super_admin" && !user.workspaceMode) return;
    if (user.role === "super_admin") return; // preview / as_entitled still need tenant scope but skip billing
    const tenantId = tenantIdOf(request);
    const current = await getTenantSubscription(request.server.db, tenantId);
    if (subscriptionAllowsAccess(current?.subscription ?? null)) return;
    return reply.code(402).send({
      error:
        "Subscription required. Your trial has ended or payment is pending. Open Billing to subscribe.",
      code: "subscription_required",
    });
  };
}
