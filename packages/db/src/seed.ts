import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import {
  createDb,
  employees,
  plans,
  tenantSubscriptions,
  tenants,
  users,
} from "./index.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://hr:hr@localhost:5432/hr_system";

const DEFAULT_PLANS = [
  {
    code: "trial",
    name: "Trial",
    description: "14-day free trial for new tenants",
    amountCents: 0,
    currency: "USD",
    intervalDays: 15,
    seatLimit: 10,
    active: true,
    features: { trialDays: 14 },
  },
  {
    code: "starter",
    name: "Starter",
    description: "Small teams getting started",
    amountCents: 4900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 25,
    active: true,
    features: {},
  },
  {
    code: "pro",
    name: "Pro",
    description: "Growing field operations",
    amountCents: 14900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: 100,
    active: true,
    features: {},
  },
  {
    code: "enterprise",
    name: "Enterprise",
    description: "Unlimited seats and priority support",
    amountCents: 49900,
    currency: "USD",
    intervalDays: 30,
    seatLimit: null,
    active: true,
    features: {},
  },
] as const;

async function main() {
  const { db, client } = createDb(connectionString);

  const superEmail =
    process.env.SEED_SUPER_ADMIN_EMAIL ?? "superadmin@hr.local";
  const superPassword =
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? "SuperAdmin123!";

  const existingSuper = await db.query.users.findFirst({
    where: eq(users.email, superEmail),
  });

  if (!existingSuper) {
    await db.insert(users).values({
      tenantId: null,
      email: superEmail,
      name: "Platform Super Admin",
      role: "super_admin",
      passwordHash: await bcrypt.hash(superPassword, 10),
    });
    console.log(`Created super admin ${superEmail}`);
  }

  for (const plan of DEFAULT_PLANS) {
    const existing = await db.query.plans.findFirst({
      where: eq(plans.code, plan.code),
    });
    if (!existing) {
      await db.insert(plans).values(plan);
      console.log(`Created plan ${plan.code}`);
    }
  }

  const trialPlan = await db.query.plans.findFirst({
    where: eq(plans.code, "trial"),
  });

  async function ensureTenant(
    slug: string,
    name: string,
    adminEmail: string,
    adminPassword: string,
  ) {
    let tenant = await db.query.tenants.findFirst({
      where: eq(tenants.slug, slug),
    });
    if (!tenant) {
      const [created] = await db
        .insert(tenants)
        .values({
          name,
          slug,
          settings: {
            timezone: "Africa/Cairo",
            pingIntervalSec: 20,
            locationRetentionDays: 60,
            missedClockOutHours: 12,
            brandingName: name,
          },
        })
        .returning();
      tenant = created;
      console.log(`Created tenant ${slug}`);
    }

    let admin = await db.query.users.findFirst({
      where: eq(users.email, adminEmail),
    });
    if (!admin) {
      const [createdAdmin] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: adminEmail,
          name: `${name} Admin`,
          role: "tenant_admin",
          passwordHash: await bcrypt.hash(adminPassword, 10),
        })
        .returning();
      admin = createdAdmin;

      await db.insert(employees).values({
        tenantId: tenant.id,
        userId: admin.id,
        jobTitle: "Tenant Admin",
        status: "active",
      });
      console.log(`Created tenant admin ${adminEmail}`);
    }

    const empEmail = `employee@${slug}.local`;
    let empUser = await db.query.users.findFirst({
      where: eq(users.email, empEmail),
    });
    if (!empUser) {
      const [createdEmp] = await db
        .insert(users)
        .values({
          tenantId: tenant.id,
          email: empEmail,
          name: `${name} Employee`,
          role: "employee",
          passwordHash: await bcrypt.hash("Employee123!", 10),
        })
        .returning();
      empUser = createdEmp;
      await db.insert(employees).values({
        tenantId: tenant.id,
        userId: empUser.id,
        jobTitle: "Field Worker",
        status: "active",
      });
      console.log(`Created employee ${empEmail}`);
    }

    if (trialPlan) {
      const existingSub = await db.query.tenantSubscriptions.findFirst({
        where: eq(tenantSubscriptions.tenantId, tenant.id),
      });
      if (!existingSub) {
        const now = new Date();
        const trialEnds = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        await db.insert(tenantSubscriptions).values({
          tenantId: tenant.id,
          planId: trialPlan.id,
          status: "trialing",
          currentPeriodStart: now,
          currentPeriodEnd: trialEnds,
          trialEndsAt: trialEnds,
        });
        console.log(`Created trial subscription for ${slug}`);
      }
    }

    return tenant;
  }

  await ensureTenant(
    "cms",
    "Creative Multi Solutions",
    "admin@cms.local",
    "Admin123!",
  );
  await ensureTenant(
    "acme",
    "Acme Field Services",
    "admin@acme.local",
    "Admin123!",
  );

  await client.end();
  console.log("Seed complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
