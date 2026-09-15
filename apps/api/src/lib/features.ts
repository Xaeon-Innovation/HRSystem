import {
  getTenantSubscription,
  subscriptionAllowsAccess,
} from "./billing.js";
import type { Db, PlanFeatures } from "@hr/db";
import {
  DEFAULT_LOCATION_RETENTION_DAYS,
  DEFAULT_PING_INTERVAL_SEC,
  type PlanFeatureKey,
} from "@hr/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireTenantScope, tenantIdOf } from "../types.js";

const FEATURE_UPGRADE_HINT: Record<PlanFeatureKey, string> = {
  fieldOps: "Upgrade to Field, Ops, or Scale.",
  peopleOps: "Upgrade to People, Ops, or Scale.",
  analytics: "Upgrade to Ops or Scale.",
  integrations: "Upgrade to Scale or contact sales for Enterprise.",
};

export async function getTenantPlanFeatures(
  db: Db,
  tenantId: string,
): Promise<PlanFeatures> {
  const current = await getTenantSubscription(db, tenantId);
  if (!current?.subscription) return {};
  if (!subscriptionAllowsAccess(current.subscription)) return {};
  return (current.plan?.features ?? {}) as PlanFeatures;
}

export async function tenantHasFeature(
  db: Db,
  tenantId: string,
  feature: PlanFeatureKey,
): Promise<boolean> {
  const features = await getTenantPlanFeatures(db, tenantId);
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

export function requirePlanFeature(feature: PlanFeatureKey) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireActiveSubscription()(request, reply);
    if (reply.sent) return;
    const tenantId = tenantIdOf(request);
    const ok = await tenantHasFeature(request.server.db, tenantId, feature);
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
