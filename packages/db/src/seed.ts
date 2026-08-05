import "dotenv/config";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { createDb, employees, tenants, users } from "./index.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://hr:hr@localhost:5432/hr_system";

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
