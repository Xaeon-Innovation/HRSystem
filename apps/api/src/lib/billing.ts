import { and, count, eq, inArray, lt } from "drizzle-orm";
import {
  employees,
  plans,
  tenantSubscriptions,
  type Db,
} from "@hr/db";

export const ACTIVE_SUB_STATUSES = [
  "trialing",
  "active",
  "past_due",
] as const;

export type SubscriptionAccessRow = {
  status: (typeof tenantSubscriptions.$inferSelect)["status"];
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
};

export async function countActiveSeats(db: Db, tenantId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(employees)
    .where(
      and(eq(employees.tenantId, tenantId), eq(employees.status, "active")),
    );
  return Number(row?.value ?? 0);
}

export async function getTenantSubscription(db: Db, tenantId: string) {
  const sub = await db.query.tenantSubscriptions.findFirst({
    where: eq(tenantSubscriptions.tenantId, tenantId),
  });
  if (!sub) return null;
  const plan = await db.query.plans.findFirst({
    where: eq(plans.id, sub.planId),
  });
  return { subscription: sub, plan: plan ?? null };
}

export async function assertSeatAvailable(
  db: Db,
  tenantId: string,
  additionalSeats = 1,
): Promise<{ ok: true; seatsUsed: number; seatLimit: number | null } | { ok: false; error: string; seatsUsed: number; seatLimit: number | null }> {
  const current = await getTenantSubscription(db, tenantId);
  const seatsUsed = await countActiveSeats(db, tenantId);
  const seatLimit = effectiveSeatLimit(current?.subscription, current?.plan);
  if (seatLimit != null && seatsUsed + additionalSeats > seatLimit) {
    return {
      ok: false,
      error: `Seat limit reached (${seatsUsed}/${seatLimit}). Upgrade your plan to add more employees.`,
      seatsUsed,
      seatLimit,
    };
  }
  return { ok: true, seatsUsed, seatLimit };
}

/** Prefer purchased_seats from Polar; fall back to catalog seat_limit. */
export function effectiveSeatLimit(
  subscription: { purchasedSeats?: number | null } | null | undefined,
  plan: { seatLimit?: number | null } | null | undefined,
): number | null {
  if (subscription?.purchasedSeats != null) {
    return subscription.purchasedSeats;
  }
  return plan?.seatLimit ?? null;
}

/**
 * Whether the tenant currently has live product access.
 * - `active` / `past_due`: yes
 * - `trialing`: yes only while trialEndsAt is in the future
 * - missing subscription: no (paid signup before Polar confirms)
 * - expired / canceled: no
 */
export function subscriptionAllowsAccess(
  subscription:
    | SubscriptionAccessRow
    | (typeof tenantSubscriptions.$inferSelect)["status"]
    | null
    | undefined,
): boolean {
  if (subscription == null) return false;
  if (typeof subscription === "string") {
    // Legacy status-only callers (tests / simple checks).
    if (subscription === "trialing") return true;
    return (ACTIVE_SUB_STATUSES as readonly string[]).includes(subscription);
  }
  const { status, trialEndsAt } = subscription;
  if (status === "active" || status === "past_due") return true;
  if (status === "trialing") {
    if (!trialEndsAt) return false;
    return trialEndsAt.getTime() > Date.now();
  }
  return false;
}

export async function startTrialForTenant(
  db: Db,
  tenantId: string,
  trialDays?: number,
) {
  const trialPlan = await db.query.plans.findFirst({
    where: and(eq(plans.code, "trial"), eq(plans.active, true)),
  });
  if (!trialPlan) return null;

  const existing = await db.query.tenantSubscriptions.findFirst({
    where: eq(tenantSubscriptions.tenantId, tenantId),
  });
  if (existing) return existing;

  const features = (trialPlan.features ?? {}) as Record<string, unknown>;
  const fromPlan =
    typeof features.trialDays === "number" && Number.isFinite(features.trialDays)
      ? features.trialDays
      : 14;
  const days = trialDays ?? fromPlan;

  const now = new Date();
  const trialEnds = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const [created] = await db
    .insert(tenantSubscriptions)
    .values({
      tenantId,
      planId: trialPlan.id,
      status: "trialing",
      currentPeriodStart: now,
      currentPeriodEnd: trialEnds,
      trialEndsAt: trialEnds,
    })
    .returning();
  return created;
}

/** Mark past-due trials as expired. Does not suspend the tenant. */
export async function expirePastTrials(db: Db) {
  const now = new Date();
  const updated = await db
    .update(tenantSubscriptions)
    .set({ status: "expired", updatedAt: now })
    .where(
      and(
        eq(tenantSubscriptions.status, "trialing"),
        lt(tenantSubscriptions.trialEndsAt, now),
      ),
    )
    .returning({ id: tenantSubscriptions.id, tenantId: tenantSubscriptions.tenantId });
  return updated;
}

export async function listSubscriptionsWithDetails(db: Db) {
  const rows = await db.query.tenantSubscriptions.findMany({
    orderBy: (t, { desc }) => [desc(t.updatedAt)],
  });
  const planIds = [...new Set(rows.map((r) => r.planId))];
  const planRows =
    planIds.length === 0
      ? []
      : await db.query.plans.findMany({
          where: inArray(plans.id, planIds),
        });
  const planMap = new Map(planRows.map((p) => [p.id, p]));
  return rows.map((sub) => ({
    ...sub,
    plan: planMap.get(sub.planId) ?? null,
  }));
}
