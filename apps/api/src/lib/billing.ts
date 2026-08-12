import { and, count, eq, inArray } from "drizzle-orm";
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
  const seatLimit = current?.plan?.seatLimit ?? null;
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

export function subscriptionAllowsAccess(
  status: (typeof tenantSubscriptions.$inferSelect)["status"] | undefined,
): boolean {
  if (!status) return true; // no sub yet — allow (trial assignment is preferred)
  return (ACTIVE_SUB_STATUSES as readonly string[]).includes(status);
}

export async function startTrialForTenant(
  db: Db,
  tenantId: string,
  trialDays = 14,
) {
  const trialPlan = await db.query.plans.findFirst({
    where: and(eq(plans.code, "trial"), eq(plans.active, true)),
  });
  if (!trialPlan) return null;

  const existing = await db.query.tenantSubscriptions.findFirst({
    where: eq(tenantSubscriptions.tenantId, tenantId),
  });
  if (existing) return existing;

  const now = new Date();
  const trialEnds = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
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
