import type { FastifyInstance } from "fastify";
import { and, eq, gte, lte } from "drizzle-orm";
import {
  employeeDocuments,
  employees,
  notifications,
  tenants,
  users,
} from "@hr/db";
import { addDays, formatDayInZone } from "../lib/timezone.js";
import { createNotification } from "./notifications.js";

function documentLabel(doc: {
  label: string | null;
  type: string;
  documentNumber: string | null;
}): string {
  if (doc.label?.trim()) return doc.label.trim();
  if (doc.documentNumber?.trim()) return `${doc.type} ${doc.documentNumber}`;
  return doc.type;
}

async function wasNotifiedRecently(
  app: FastifyInstance,
  tenantId: string,
  userId: string,
  title: string,
): Promise<boolean> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await app.db.query.notifications.findFirst({
    where: and(
      eq(notifications.tenantId, tenantId),
      eq(notifications.userId, userId),
      eq(notifications.title, title),
      gte(notifications.createdAt, cutoff),
    ),
    columns: { id: true },
  });
  return Boolean(recent);
}

export async function runDocumentExpiryForTenant(
  app: FastifyInstance,
  tenantId: string,
  asOfDate?: Date,
): Promise<number> {
  const tenant = await app.db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
    columns: { settings: true },
  });
  const tz = tenant?.settings.timezone ?? "UTC";
  const today = formatDayInZone(asOfDate ?? new Date(), tz);
  const horizon = addDays(today, 30);

  const docs = await app.db.query.employeeDocuments.findMany({
    where: and(
      eq(employeeDocuments.tenantId, tenantId),
      lte(employeeDocuments.expiresOn, horizon),
    ),
  });
  if (docs.length === 0) return 0;

  const admins = await app.db.query.users.findMany({
    where: and(eq(users.tenantId, tenantId), eq(users.role, "tenant_admin")),
    columns: { id: true },
  });

  let notified = 0;
  for (const doc of docs) {
    const emp = await app.db.query.employees.findFirst({
      where: and(
        eq(employees.id, doc.employeeId),
        eq(employees.tenantId, tenantId),
      ),
      columns: { userId: true },
    });
    if (!emp) continue;

    const label = documentLabel(doc);
    const title = `Document expiring: ${label}`;
    const body = `“${label}” expires on ${doc.expiresOn}. Update or renew it soon.`;
    const metadata = {
      documentId: doc.id,
      employeeId: doc.employeeId,
      expiresOn: doc.expiresOn,
      type: doc.type,
    };

    if (!(await wasNotifiedRecently(app, tenantId, emp.userId, title))) {
      await createNotification(app, {
        tenantId,
        userId: emp.userId,
        type: "alert",
        title,
        body,
        metadata,
      });
      notified += 1;
    }

    for (const admin of admins) {
      if (admin.id === emp.userId) continue;
      if (await wasNotifiedRecently(app, tenantId, admin.id, title)) continue;
      await createNotification(app, {
        tenantId,
        userId: admin.id,
        type: "alert",
        title,
        body,
        metadata,
      });
      notified += 1;
    }
  }
  return notified;
}

export async function runDocumentExpiryForAllTenants(
  app: FastifyInstance,
  asOfDate?: Date,
): Promise<number> {
  const allTenants = await app.db.query.tenants.findMany({
    where: eq(tenants.status, "active"),
    columns: { id: true },
  });
  let total = 0;
  for (const tenant of allTenants) {
    try {
      total += await runDocumentExpiryForTenant(app, tenant.id, asOfDate);
    } catch (err) {
      app.log.error(
        { err, tenantId: tenant.id },
        "document expiry job failed",
      );
    }
  }
  return total;
}
