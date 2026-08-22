import { and, eq } from "drizzle-orm";
import {
  employees,
  externalBranchLinks,
  externalEmployeeLinks,
  users,
  type Db,
} from "@hr/db";

export type IdentityHints = {
  externalEmployeeKey?: string | null;
  employeeEmail?: string | null;
  employeePhone?: string | null;
  externalBranchKey?: string | null;
};

export async function resolveEmployee(
  db: Db,
  tenantId: string,
  connectionId: string,
  hints: IdentityHints,
): Promise<{ employeeId: string | null; matchMethod: string | null }> {
  const key = hints.externalEmployeeKey?.toString().trim();
  if (key) {
    const existing = await db.query.externalEmployeeLinks.findFirst({
      where: and(
        eq(externalEmployeeLinks.tenantId, tenantId),
        eq(externalEmployeeLinks.connectionId, connectionId),
        eq(externalEmployeeLinks.externalEmployeeKey, key),
        eq(externalEmployeeLinks.isActive, true),
      ),
    });
    if (existing?.employeeId) {
      return { employeeId: existing.employeeId, matchMethod: existing.matchMethod };
    }
  }

  const uuidLike =
    typeof key === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      key,
    );
  if (uuidLike && key) {
    const emp = await db.query.employees.findFirst({
      where: and(eq(employees.id, key), eq(employees.tenantId, tenantId)),
    });
    if (emp) {
      await upsertEmployeeLink(db, tenantId, connectionId, key, emp.id, "direct_id");
      return { employeeId: emp.id, matchMethod: "direct_id" };
    }
  }

  const email = hints.employeeEmail?.toString().trim().toLowerCase();
  if (email) {
    const user = await db.query.users.findFirst({
      where: and(eq(users.email, email), eq(users.tenantId, tenantId)),
    });
    if (user) {
      const emp = await db.query.employees.findFirst({
        where: and(eq(employees.userId, user.id), eq(employees.tenantId, tenantId)),
      });
      if (emp) {
        if (key) {
          await upsertEmployeeLink(
            db,
            tenantId,
            connectionId,
            key,
            emp.id,
            "email",
            0.9,
          );
        }
        return { employeeId: emp.id, matchMethod: "email" };
      }
    }
  }

  const phone = hints.employeePhone?.toString().trim();
  if (phone) {
    const emp = await db.query.employees.findFirst({
      where: and(eq(employees.tenantId, tenantId), eq(employees.phone, phone)),
    });
    if (emp) {
      if (key) {
        await upsertEmployeeLink(
          db,
          tenantId,
          connectionId,
          key,
          emp.id,
          "phone",
          0.8,
        );
      }
      return { employeeId: emp.id, matchMethod: "phone" };
    }
  }

  if (key) {
    await upsertEmployeeLink(db, tenantId, connectionId, key, null, "manual", 0);
  }
  return { employeeId: null, matchMethod: null };
}

async function upsertEmployeeLink(
  db: Db,
  tenantId: string,
  connectionId: string,
  externalEmployeeKey: string,
  employeeId: string | null,
  matchMethod: "direct_id" | "email" | "phone" | "manual",
  matchConfidence = 1,
) {
  await db
    .insert(externalEmployeeLinks)
    .values({
      tenantId,
      connectionId,
      externalEmployeeKey,
      employeeId,
      matchMethod,
      matchConfidence,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [
        externalEmployeeLinks.tenantId,
        externalEmployeeLinks.connectionId,
        externalEmployeeLinks.externalEmployeeKey,
      ],
      set: {
        employeeId,
        matchMethod,
        matchConfidence,
        isActive: true,
      },
    });
}

export async function resolveBranch(
  db: Db,
  tenantId: string,
  connectionId: string,
  externalBranchKey?: string | null,
): Promise<{ branchId: string | null; siteId: string | null }> {
  const key = externalBranchKey?.toString().trim();
  if (!key) return { branchId: null, siteId: null };
  const existing = await db.query.externalBranchLinks.findFirst({
    where: and(
      eq(externalBranchLinks.tenantId, tenantId),
      eq(externalBranchLinks.connectionId, connectionId),
      eq(externalBranchLinks.externalBranchKey, key),
    ),
  });
  if (existing) {
    return { branchId: existing.branchId, siteId: existing.siteId };
  }
  await db
    .insert(externalBranchLinks)
    .values({
      tenantId,
      connectionId,
      externalBranchKey: key,
      branchId: null,
      siteId: null,
    })
    .onConflictDoNothing();
  return { branchId: null, siteId: null };
}
