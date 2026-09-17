import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  employees,
  leads,
  plans,
  tenantSubscriptions,
  tenants,
  users,
  type Db,
} from "@hr/db";
import {
  cleanFeatureOverrides,
  type CreateTenantInput,
} from "@hr/shared";
import { startTrialForTenant } from "./billing.js";

export type ProvisionTenantOptions = {
  /** When false, skip trial (paid Start now flow). Default true. */
  startTrial?: boolean;
};

export type ProvisionedTenant = {
  tenant: typeof tenants.$inferSelect;
  admin: typeof users.$inferSelect;
  employeeId: string;
  subscription: Awaited<ReturnType<typeof startTrialForTenant>> | typeof tenantSubscriptions.$inferSelect | null;
};

export async function provisionTenant(
  db: Db,
  data: CreateTenantInput,
  options: ProvisionTenantOptions = {},
): Promise<
  | { ok: true; result: ProvisionedTenant }
  | { ok: false; status: 409; error: string }
> {
  const startTrial = options.startTrial !== false;
  const customPlanCode = data.planCode?.trim() || null;

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

  const overrides = cleanFeatureOverrides(data.featureOverrides ?? null);

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
        ...(Object.keys(overrides).length > 0
          ? { featureOverrides: overrides }
          : {}),
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

  let subscription: ProvisionedTenant["subscription"] = null;

  if (customPlanCode) {
    const plan = await db.query.plans.findFirst({
      where: eq(plans.code, customPlanCode),
    });
    if (plan) {
      const now = new Date();
      const [created] = await db
        .insert(tenantSubscriptions)
        .values({
          tenantId: tenant.id,
          planId: plan.id,
          status: "active",
          purchasedSeats: data.purchasedSeats ?? null,
          currentPeriodStart: now,
          currentPeriodEnd: new Date(
            now.getTime() + 365 * 24 * 60 * 60 * 1000,
          ),
        })
        .returning();
      subscription = created;
    }
  } else if (startTrial) {
    subscription = await startTrialForTenant(db, tenant.id);
  }

  if (data.leadId) {
    await db
      .update(leads)
      .set({
        status: "converted",
        tenantId: tenant.id,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, data.leadId));
  }

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
