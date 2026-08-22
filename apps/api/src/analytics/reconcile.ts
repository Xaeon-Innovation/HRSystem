import { and, count, eq, gte } from "drizzle-orm";
import {
  analyticsAlerts,
  canonicalJobEvents,
  canonicalSalesEvents,
  canonicalTaskEvents,
  canonicalVisitEvents,
  employeeDailyAnalytics,
  integrationRawEvents,
  tenants,
  type Db,
} from "@hr/db";
import { todayInZone } from "../lib/timezone.js";

export async function reconcileTenant(db: Db, tenantId: string) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });
  if (!tenant) return;
  const today = todayInZone(tenant.settings.timezone ?? "UTC");

  const [raw] = await db
    .select({ n: count() })
    .from(integrationRawEvents)
    .where(
      and(
        eq(integrationRawEvents.tenantId, tenantId),
        eq(integrationRawEvents.processingStatus, "processed"),
      ),
    );
  const [jobs] = await db
    .select({ n: count() })
    .from(canonicalJobEvents)
    .where(eq(canonicalJobEvents.tenantId, tenantId));
  const [visits] = await db
    .select({ n: count() })
    .from(canonicalVisitEvents)
    .where(eq(canonicalVisitEvents.tenantId, tenantId));
  const [tasks] = await db
    .select({ n: count() })
    .from(canonicalTaskEvents)
    .where(eq(canonicalTaskEvents.tenantId, tenantId));
  const [sales] = await db
    .select({ n: count() })
    .from(canonicalSalesEvents)
    .where(eq(canonicalSalesEvents.tenantId, tenantId));
  const [summaries] = await db
    .select({ n: count() })
    .from(employeeDailyAnalytics)
    .where(
      and(
        eq(employeeDailyAnalytics.tenantId, tenantId),
        gte(employeeDailyAnalytics.day, today),
      ),
    );

  const canonicalTotal =
    Number(jobs?.n ?? 0) +
    Number(visits?.n ?? 0) +
    Number(tasks?.n ?? 0) +
    Number(sales?.n ?? 0);
  const processed = Number(raw?.n ?? 0);

  if (processed > 0 && canonicalTotal === 0) {
    await db.insert(analyticsAlerts).values({
      tenantId,
      alertType: "reconciliation_drift",
      severity: "high",
      entityType: "tenant",
      entityId: tenantId,
      alertDate: today,
      title: "Reconciliation drift",
      description: `${processed} processed raw events but 0 canonical records.`,
      payloadJson: { processed, canonicalTotal, summaries: Number(summaries?.n ?? 0) },
      status: "open",
    });
  }
}

export async function reconcileAll(db: Db) {
  const all = await db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
  });
  for (const tenant of all) {
    await reconcileTenant(db, tenant.id);
  }
}
