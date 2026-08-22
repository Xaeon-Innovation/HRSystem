import { getTenantSubscription } from "./billing.js";
import type { Db } from "@hr/db";
import type { PlanFeatureKey } from "@hr/shared";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireTenantScope, tenantIdOf } from "../types.js";

export async function tenantHasFeature(
  db: Db,
  tenantId: string,
  feature: PlanFeatureKey,
): Promise<boolean> {
  const current = await getTenantSubscription(db, tenantId);
  const features = current?.plan?.features ?? {};
  return features[feature] === true;
}

export function requirePlanFeature(feature: PlanFeatureKey) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    await requireTenantScope()(request, reply);
    if (reply.sent) return;
    const tenantId = tenantIdOf(request);
    const ok = await tenantHasFeature(request.server.db, tenantId, feature);
    if (!ok) {
      return reply.code(403).send({
        error: `This plan does not include ${feature}. Upgrade to Pro or Enterprise.`,
      });
    }
  };
}
