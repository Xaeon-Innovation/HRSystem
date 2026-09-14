import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  employees,
  sealSecret,
  tenants,
  users,
  type Db,
} from "@hr/db";
import type { CreateTenantInput } from "@hr/shared";
import { startTrialForTenant } from "./billing.js";

export type ProvisionedTenant = {
  tenant: typeof tenants.$inferSelect;
  admin: typeof users.$inferSelect;
  employeeId: string;
  subscription: Awaited<ReturnType<typeof startTrialForTenant>>;
};

export async function provisionTenant(
  db: Db,
  data: CreateTenantInput,
): Promise<
  | { ok: true; result: ProvisionedTenant }
  | { ok: false; status: 409; error: string }
> {
  const existingSlug = await db.query.tenants.findFirst({
    where: eq(tenants.slug, data.slug),
  });
  if (existingSlug) {
    return { ok: false, status: 409, error: "Slug already exists" };
  }

  const existingEmail = await db.query.users.findFirst({
    where: eq(users.email, data.adminEmail),
  });
  if (existingEmail) {
    return { ok: false, status: 409, error: "Email already registered" };
  }

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: data.name,
      slug: data.slug,
      settings: {
        brandingName: data.name,
        timezone: "Africa/Cairo",
        pingIntervalSec: 60,
        locationRetentionDays: 30,
        missedClockOutHours: 12,
      },
    })
    .returning();

  const [admin] = await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      email: data.adminEmail,
      name: data.adminName,
      role: "tenant_admin",
      passwordHash: await bcrypt.hash(data.adminPassword, 10),
      loginPasswordCipher: sealSecret(data.adminPassword),
    })
    .returning();

  const [employee] = await db
    .insert(employees)
    .values({
      tenantId: tenant.id,
      userId: admin.id,
      jobTitle: "Tenant Admin",
      status: "active",
    })
    .returning();

  const subscription = await startTrialForTenant(db, tenant.id);

  return {
    ok: true,
    result: {
      tenant,
      admin,
      employeeId: employee.id,
      subscription,
    },
  };
}
